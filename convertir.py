"""Convertit l'export TimeTree (.ics) en un petit fichier JSON facile à lire pour la tablette.

Usage : python scripts/convertir.py timetree.ics site/cal-CLE.json
Garde seulement les événements d'hier à dans 8 jours, avec les répétitions déjà calculées.
"""
import json
import os
import sys
from datetime import date, datetime, time, timedelta
from zoneinfo import ZoneInfo

import icalendar
import recurring_ical_events

TZ = ZoneInfo(os.environ.get("FUSEAU", "America/Toronto"))
JOURS_AVANT, JOURS_APRES = 1, 8


def en_local(v):
    """Ramène une date ou une date-heure dans le fuseau de la maison."""
    if isinstance(v, datetime):
        if v.tzinfo is None:
            v = v.replace(tzinfo=TZ)
        return v.astimezone(TZ)
    return v


def main(src, dst):
    with open(src, "rb") as f:
        cal = icalendar.Calendar.from_ical(f.read())

    aujourd_hui = datetime.now(TZ).date()
    debut = aujourd_hui - timedelta(days=JOURS_AVANT)
    fin = aujourd_hui + timedelta(days=JOURS_APRES)

    sortie = []
    for ev in recurring_ical_events.of(cal).between(debut, fin):
        titre = str(ev.get("SUMMARY", "")).strip() or "(sans titre)"
        lieu = str(ev.get("LOCATION", "") or "").strip()
        couleur = str(ev.get("COLOR", "") or "").strip()
        d0 = en_local(ev.decoded("DTSTART"))
        d1 = en_local(ev.decoded("DTEND")) if ev.get("DTEND") else None

        if not isinstance(d0, datetime):
            # Journée entière (la date de fin est exclusive en iCal)
            dernier = (d1 - timedelta(days=1)) if d1 else d0
            jour = d0
            while jour <= dernier:
                if debut <= jour <= fin:
                    sortie.append({"d": jour.isoformat(), "s": None, "e": None, "t": titre, "l": lieu, "c": couleur})
                jour += timedelta(days=1)
            continue

        d1 = d1 or d0
        jour = d0.date()
        while jour <= d1.date():
            premier = jour == d0.date()
            dernier = jour == d1.date()
            # Un événement qui finit pile à minuit n'apparaît pas le lendemain
            if not premier and dernier and d1.time() == time(0, 0):
                break
            if debut <= jour <= fin:
                sortie.append({
                    "d": jour.isoformat(),
                    "s": d0.strftime("%H:%M") if premier else "00:00",
                    "e": d1.strftime("%H:%M") if dernier else "24:00",
                    "t": titre, "l": lieu, "c": couleur,
                    "suite": not premier,
                })
            jour += timedelta(days=1)

    sortie.sort(key=lambda e: (e["d"], e["s"] is not None, e["s"] or "", e["t"]))
    os.makedirs(os.path.dirname(dst) or ".", exist_ok=True)
    with open(dst, "w", encoding="utf-8") as f:
        json.dump({"maj": datetime.now(TZ).isoformat(timespec="minutes"), "evenements": sortie}, f, ensure_ascii=False)
    print(f"{len(sortie)} événements écrits dans {dst}")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
