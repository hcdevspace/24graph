import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Plane, Radio, ChevronRight, ChevronDown, X, Play, Pause, RotateCcw, Wifi, WifiOff, Navigation2 } from "lucide-react";

const RFD_DATA = {"sids": {"IRFD": [{"name": "DARRK 3 RNAV DEPARTURE", "code": "DARRK3.DARRK", "rwyProcs": [{"rwys": ["07L", "07C", "07R"], "legs": []}, {"rwys": ["25L"], "legs": [{"t": "F", "n": "DOCKR", "alt": "at or above 1000"}, {"t": "T", "d": 261}, {"t": "F", "n": "QURAN", "alt": "at or above 2000"}, {"t": "T", "d": 291}, {"t": "F", "n": "EXMOR"}, {"t": "T", "d": 322}, {"t": "F", "n": "DARRK", "alt": "at or above 3000"}]}, {"rwys": ["25C", "25R"], "legs": [{"t": "F", "n": "DLREY", "alt": "at or above 1000"}, {"t": "T", "d": 273}, {"t": "F", "n": "ALOHA", "alt": "at or above 2500"}, {"t": "T", "d": 294}, {"t": "F", "n": "DARRK", "alt": "at or above 3000"}]}], "transitions": [{"name": "SEEKS", "code": "DARRK3.SEEKS", "legs": [{"t": "T", "d": 311}, {"t": "F", "n": "BEANS"}, {"t": "T", "d": 234}, {"t": "F", "n": "DINTY"}, {"t": "F", "n": "SEEKS"}]}, {"name": "SPACE", "code": "DARRK3.SPACE", "legs": [{"t": "T", "d": 311}, {"t": "F", "n": "BEANS"}, {"t": "T", "d": 301}, {"t": "F", "n": "RIZIN"}, {"t": "T", "d": 304}, {"t": "F", "n": "BLANK"}, {"t": "F", "n": "SPACE"}]}]}, {"name": "KENED 2 RNAV DEPARTURE", "code": "KENED2.KENED", "rwyProcs": [{"rwys": ["07L", "07C", "07R"], "legs": []}, {"rwys": ["25L", "25C", "25R"], "legs": []}], "transitions": [{"name": "RENDR", "code": "KENED2.RENDR", "legs": [{"t": "F", "n": "KUNAV"}, {"t": "T", "d": 360}, {"t": "F", "n": "KENED", "alt": "3000"}, {"t": "T", "d": 360}, {"t": "F", "n": "WELSH", "alt": "1000"}, {"t": "T", "d": 360}, {"t": "F", "n": "RENDR", "alt": "1000"}]}, {"name": "JOOPY", "code": "KENED2.JOOPY", "legs": [{"t": "F", "n": "KUNAV"}, {"t": "T", "d": 360}, {"t": "F", "n": "KENED", "alt": "3000"}, {"t": "T", "d": 360}, {"t": "F", "n": "WELSH", "alt": "1000"}, {"t": "T", "d": 36}, {"t": "F", "n": "PROBE", "alt": "1000"}, {"t": "T", "d": 51}, {"t": "F", "n": "JOOPY", "alt": "1000"}]}, {"name": "DINER", "code": "KENED2.DINER", "legs": [{"t": "F", "n": "KUNAV"}, {"t": "T", "d": 360}, {"t": "F", "n": "KENED", "alt": "3000"}, {"t": "T", "d": 55}, {"t": "F", "n": "INDEX", "alt": "1000"}, {"t": "T", "d": 49}, {"t": "F", "n": "NKITA", "alt": "1000"}, {"t": "F", "n": "DINER", "alt": "1200"}]}]}, {"name": "LOGAN 4 RNAV DEPARTURE", "code": "LOGAN4.LOGAN", "rwyProcs": [{"rwys": ["25L"], "legs": [{"t": "F", "n": "DOCKR", "alt": "at or above 1000"}, {"t": "T", "d": 261}, {"t": "F", "n": "QURAN", "alt": "at or above 2000"}, {"t": "T", "d": 291}, {"t": "F", "n": "EXMOR"}, {"t": "T", "d": 349}, {"t": "F", "n": "LOGAN", "alt": "at or above 3000"}]}, {"rwys": ["25C", "25R"], "legs": [{"t": "F", "n": "DLREY", "alt": "at or above 1000"}, {"t": "T", "d": 271}, {"t": "F", "n": "DAALE"}, {"t": "T", "d": 301}, {"t": "F", "n": "LOGAN", "alt": "at or above 3000"}]}], "transitions": [{"name": "RENDR", "code": "LOGAN4.RENDR", "legs": [{"t": "T", "d": 8}, {"t": "T", "d": 358}, {"t": "F", "n": "BUCFA", "alt": "1800"}, {"t": "T", "d": 33}, {"t": "F", "n": "SKYDV", "alt": "1000"}, {"t": "F", "n": "WELSH"}, {"t": "T", "d": 360}, {"t": "F", "n": "RENDR", "alt": "1000"}]}, {"name": "DINER", "code": "LOGAN4.DINER", "legs": [{"t": "T", "d": 8}, {"t": "T", "d": 358}, {"t": "F", "n": "BUCFA", "alt": "1800"}, {"t": "T", "d": 33}, {"t": "F", "n": "SKYDV", "alt": "1000"}, {"t": "F", "n": "WELSH"}, {"t": "T", "d": 71}, {"t": "F", "n": "MDWAY", "alt": "1000"}, {"t": "F", "n": "DINER", "alt": "1200"}]}]}, {"name": "OSHNN 1 RNAV DEPARTURE", "code": "OSHNN1.OSHNN", "rwyProcs": [{"rwys": ["25L"], "legs": [{"t": "F", "n": "HIIPR", "alt": "at or above 1700"}, {"t": "T", "d": 210}, {"t": "F", "n": "SHAEF"}]}, {"rwys": ["25C"], "legs": [{"t": "F", "n": "FABRA", "alt": "at or above 1700"}, {"t": "T", "d": 205}, {"t": "F", "n": "SHAEF"}]}, {"rwys": ["25R"], "legs": [{"t": "F", "n": "FABRA", "alt": "at or above 1700"}, {"t": "T", "d": 205}, {"t": "F", "n": "SHAEF"}]}], "transitions": [{"name": "SILVA", "code": "OSHNN1.SILVA", "legs": [{"t": "T", "d": 160}, {"t": "F", "n": "PEVEE"}, {"t": "T", "d": 90}, {"t": "F", "n": "HOLTZ"}, {"t": "F", "n": "OSHNN", "alt": "at or above 3000"}, {"t": "T", "d": 18}, {"t": "F", "n": "CAHIL", "alt": "1800"}, {"t": "F", "n": "ZOOMM", "alt": "1500"}, {"t": "T", "d": 31}, {"t": "F", "n": "SEBBY", "alt": "1000"}, {"t": "F", "n": "ATPEV", "alt": "1000"}, {"t": "F", "n": "ARCUS", "alt": "1000"}, {"t": "F", "n": "OCEEN", "alt": "1000"}, {"t": "T", "d": 59}, {"t": "F", "n": "SILVA", "alt": "1000"}]}, {"name": "CYRIL", "code": "OSHNN1.CYRIL", "legs": [{"t": "T", "d": 160}, {"t": "F", "n": "PEVEE"}, {"t": "T", "d": 90}, {"t": "F", "n": "HOLTZ"}, {"t": "F", "n": "OSHNN", "alt": "at or above 3000"}, {"t": "T", "d": 18}, {"t": "F", "n": "CAHIL", "alt": "1800"}, {"t": "F", "n": "ZOOMM", "alt": "1500"}, {"t": "T", "d": 31}, {"t": "F", "n": "SEBBY", "alt": "1000"}, {"t": "F", "n": "ATPEV", "alt": "1000"}, {"t": "F", "n": "ARCUS", "alt": "1000"}, {"t": "F", "n": "OCEEN", "alt": "1000"}, {"t": "T", "d": 59}, {"t": "F", "n": "SILVA", "alt": "1000"}, {"t": "T", "d": 76}, {"t": "F", "n": "GOOSE", "alt": "1000"}, {"t": "F", "n": "CYRIL", "alt": "1000"}]}, {"name": "GRASS", "code": "OSHNN1.GRASS", "legs": [{"t": "T", "d": 160}, {"t": "F", "n": "PEVEE"}, {"t": "T", "d": 90}, {"t": "F", "n": "HOLTZ"}, {"t": "F", "n": "OSHNN", "alt": "at or above 3000"}, {"t": "T", "d": 18}, {"t": "F", "n": "CAHIL", "alt": "1800"}, {"t": "F", "n": "ZOOMM", "alt": "1500"}, {"t": "T", "d": 75}, {"t": "F", "n": "JAMSI", "alt": "1000"}, {"t": "T", "d": 107}, {"t": "F", "n": "PMPKN", "alt": "1000"}, {"t": "F", "n": "GRASS", "alt": "1000"}]}]}, {"name": "TRAINING 1 RNAV DEPARTURE", "code": "TRN1.TRN", "rwyProcs": [{"rwys": ["25L"], "legs": [{"t": "F", "n": "DOCKR", "alt": "at or above 1000"}, {"t": "T", "d": 170}, {"t": "F", "n": "WEILR"}, {"t": "T", "d": 105}, {"t": "F", "n": "TRN VOR"}, {"t": "F", "n": "TRN VOR"}]}, {"rwys": ["25C", "25R"], "legs": [{"t": "F", "n": "DLREY", "alt": "at or above 1000"}, {"t": "T", "d": 200}, {"t": "F", "n": "PEPUL"}, {"t": "T", "d": 158}, {"t": "F", "n": "HAYNK"}, {"t": "T", "d": 75}, {"t": "F", "n": "TRN VOR"}, {"t": "F", "n": "TRN VOR"}]}], "transitions": [{"name": "SILVA", "code": "TRN1.SILVA", "legs": [{"t": "T", "d": 30}, {"t": "F", "n": "MDWST", "alt": "1000"}, {"t": "F", "n": "ATPEV", "alt": "1000"}, {"t": "F", "n": "OCEEN", "alt": "1000"}, {"t": "T", "d": 60}, {"t": "F", "n": "SILVA", "alt": "1000"}]}, {"name": "CYRIL", "code": "TRN1.CYRIL", "legs": [{"t": "T", "d": 30}, {"t": "F", "n": "MDWST", "alt": "1000"}, {"t": "F", "n": "ATPEV", "alt": "1000"}, {"t": "F", "n": "OCEEN", "alt": "1000"}, {"t": "T", "d": 60}, {"t": "F", "n": "SILVA", "alt": "1000"}, {"t": "T", "d": 75}, {"t": "F", "n": "CYRIL", "alt": "1000"}]}, {"name": "GRASS", "code": "TRN1.GRASS", "legs": [{"t": "T", "d": 68}, {"t": "F", "n": "GODLU", "alt": "1000"}, {"t": "T", "d": 50}, {"t": "F", "n": "JAMSI", "alt": "1000"}, {"t": "T", "d": 110}, {"t": "F", "n": "GRASS", "alt": "1000"}]}]}, {"name": "WNNDY 3 RNAV DEPARTURE", "code": "WNNDY3.WNNDY", "rwyProcs": [{"rwys": ["ALL"], "legs": [{"t": "F", "n": "MJSTY", "alt": "at or above 1000"}, {"t": "T", "d": 45}, {"t": "F", "n": "WNNDY", "alt": "1000"}]}], "transitions": [{"name": "NARXX", "code": "WNNDY3.NARXX", "legs": [{"t": "T", "d": 360}, {"t": "F", "n": "GREEK", "alt": "1000"}, {"t": "T", "d": 20}, {"t": "F", "n": "NARXX", "alt": "1000"}]}, {"name": "SILVA", "code": "WNNDY3.SILVA", "legs": [{"t": "F", "n": "OCEEN", "alt": "1000"}, {"t": "T", "d": 56}, {"t": "F", "n": "SILVA", "alt": "1000"}]}]}], "ITKO": [{"name": "ASTRO 1 RNAV DEPARTURE", "code": "ASTRO1.ASTRO", "rwyProcs": [{"rwys": ["02"], "legs": [{"t": "T", "d": 20}]}, {"rwys": ["31"], "legs": [{"t": "T", "d": 310}, {"t": "T", "d": 180}]}], "transitions": [{"name": "BLANK", "code": "ASTRO1.BLANK", "legs": [{"t": "T", "d": 240}, {"t": "F", "n": "GULEG", "alt": "2000"}, {"t": "T", "d": 210}, {"t": "F", "n": "BLANK", "alt": "2000"}]}, {"name": "PROBE", "code": "ASTRO1.PROBE", "legs": [{"t": "T", "d": 160}, {"t": "F", "n": "PIPER", "alt": "2000"}, {"t": "T", "d": 165}, {"t": "F", "n": "PROBE", "alt": "2000"}]}, {"name": "ONDER", "code": "ASTRO1.ONDER", "legs": [{"t": "T", "d": 160}, {"t": "F", "n": "PIPER", "alt": "2000"}, {"t": "T", "d": 100}, {"t": "F", "n": "ONDER", "alt": "2000"}]}, {"name": "DINER", "code": "ASTRO1.DINER", "legs": [{"t": "T", "d": 160}, {"t": "F", "n": "PIPER", "alt": "2000"}, {"t": "T", "d": 100}, {"t": "F", "n": "ONDER", "alt": "2000"}, {"t": "T", "d": 145}, {"t": "F", "n": "DINER", "alt": "2000"}]}]}, {"name": "HONDA 1 RNAV DEPARTURE", "code": "HONDA1.HONDA", "rwyProcs": [{"rwys": ["02"], "legs": [{"t": "T", "d": 20}, {"t": "T", "d": 60}, {"t": "F", "n": "LETSE"}, {"t": "T", "d": 110}, {"t": "F", "n": "HONDA", "alt": "2000 (hard altitude)"}]}, {"rwys": ["20"], "legs": [{"t": "T", "d": 200}, {"t": "T", "d": 65}, {"t": "F", "n": "HONDA", "alt": "2000 (hard altitude)"}]}], "transitions": []}, {"name": "LETSE 1 RNAV DEPARTURE", "code": "LETSE1.KNIFE", "rwyProcs": [{"rwys": ["ALL"], "legs": [{"t": "T", "d": 20}, {"t": "T", "d": 60}, {"t": "F", "n": "LETSE"}, {"t": "T", "d": 110}, {"t": "F", "n": "HONDA", "alt": "2000"}, {"t": "T", "d": 180}, {"t": "F", "n": "KNIFE", "alt": "2000 (hard altitude)"}]}], "transitions": [{"name": "RENDR", "code": "LETSE1.RENDR", "legs": [{"t": "T", "d": 260}, {"t": "F", "n": "ONDER", "alt": "2000"}, {"t": "T", "d": 260}, {"t": "F", "n": "RENDR", "alt": "2000"}]}, {"name": "PROBE", "code": "LETSE1.PROBE", "legs": [{"t": "T", "d": 260}, {"t": "F", "n": "ONDER", "alt": "2000"}, {"t": "T", "d": 230}, {"t": "F", "n": "PROBE", "alt": "2000"}]}, {"name": "DINER", "code": "LETSE1.DINER", "legs": [{"t": "T", "d": 185}, {"t": "F", "n": "DINER", "alt": "2000"}]}]}, {"name": "ONDER 1 RNAV DEPARTURE", "code": "ONDER1.ONDER", "rwyProcs": [{"rwys": ["13"], "legs": [{"t": "T", "d": 130}, {"t": "T", "d": 175}]}, {"rwys": ["20"], "legs": [{"t": "T", "d": 200}, {"t": "T", "d": 145}]}], "transitions": [{"name": "PROBE", "code": "ONDER1.PROBE", "legs": [{"t": "T", "d": 225}, {"t": "F", "n": "PROBE", "alt": "2000"}]}, {"name": "DINER", "code": "ONDER1.DINER", "legs": [{"t": "T", "d": 145}, {"t": "F", "n": "DINER", "alt": "2000"}]}]}]}, "stars": {"IRFD": [{"name": "BEANS 1 RNAV ARRIVAL", "code": "BEANS.BEANS1", "entryTransitions": [{"name": "SPACE", "code": "SPACE.BEANS1", "legs": [{"t": "F", "n": "SPACE"}, {"t": "T", "d": 120}, {"t": "F", "n": "BEANS", "alt": "1000"}]}, {"name": "SEEKS", "code": "SEEKS.BEANS1", "legs": [{"t": "F", "n": "SEEKS"}, {"t": "T", "d": 54}, {"t": "F", "n": "BEANS", "alt": "1000"}]}], "rwyProcs": [{"rwys": ["07L", "07C", "07R"], "legs": [{"t": "T", "d": 103}, {"t": "F", "n": "LOGAN"}]}, {"rwys": ["25L", "25C", "25R"], "legs": [{"t": "T", "d": 68}, {"t": "F", "n": "BRDGE"}, {"t": "T", "d": 68}, {"t": "F", "n": "ICTAM"}, {"t": "T", "d": 80}, {"t": "F", "n": "HAWFA", "alt": "at or above 2000"}, {"t": "T", "d": 80}]}]}, {"name": "JAMSI 1 RNAV ARRIVAL", "code": "JAMSI.JAMSI1", "entryTransitions": [{"name": "ANYMS", "code": "ANYMS.JAMSI1", "legs": [{"t": "F", "n": "ANYMS"}, {"t": "T", "d": 239}, {"t": "H", "n": "JAMSI"}, {"t": "F", "n": "JAMSI", "alt": "1500"}]}, {"name": "GRASS", "code": "GRASS.JAMSI1", "legs": [{"t": "F", "n": "GRASS"}, {"t": "T", "d": 290}, {"t": "T", "d": 110}, {"t": "H", "n": "JAMSI"}, {"t": "F", "n": "JAMSI", "alt": "1500"}]}], "rwyProcs": [{"rwys": ["07L", "07C", "07R"], "legs": [{"t": "T", "d": 228}, {"t": "F", "n": "GODLU"}, {"t": "T", "d": 262}, {"t": "F", "n": "PEPUL", "alt": "1300 (hard altitude, not 'at or above')"}]}, {"rwys": ["25L", "25C", "25R"], "legs": [{"t": "T", "d": 347}]}]}, {"name": "POPPY 3 RNAV ARRIVAL", "code": "SETHR.POPPY3", "entryTransitions": [{"name": "NARXX", "code": "NARXX.POPPY3", "legs": [{"t": "F", "n": "NARXX"}, {"t": "T", "d": 223}, {"t": "F", "n": "GAVIN", "alt": "1000"}, {"t": "T", "d": 208}, {"t": "H", "n": "SETHR"}, {"t": "F", "n": "SETHR"}]}, {"name": "CYRIL", "code": "CYRIL.POPPY3", "legs": [{"t": "F", "n": "CYRIL"}, {"t": "T", "d": 261}, {"t": "F", "n": "SILVA", "alt": "1000"}, {"t": "T", "d": 240}, {"t": "F", "n": "OCEEN", "alt": "1000"}, {"t": "T", "d": 255}, {"t": "H", "n": "SETHR"}, {"t": "F", "n": "SETHR"}]}, {"name": "CAWZE", "code": "CAWZE.POPPY3", "legs": [{"t": "F", "n": "CAWZE"}, {"t": "T", "d": 287}, {"t": "F", "n": "OCEEN", "alt": "1000"}, {"t": "T", "d": 255}, {"t": "H", "n": "SETHR"}, {"t": "F", "n": "SETHR"}]}], "rwyProcs": [{"rwys": ["07L", "07C", "07R"], "legs": [{"t": "T", "d": 180}, {"t": "F", "n": "POPPY", "alt": "at or above 1200"}, {"t": "T", "d": 270}]}, {"rwys": ["25L", "25C", "25R"], "legs": [{"t": "T", "d": 180}, {"t": "F", "n": "POPPY", "alt": "at or above 1200"}, {"t": "T", "d": 157}]}]}, {"name": "KUNAV 2 RNAV ARRIVAL", "code": "KENED.KUNAV1", "entryTransitions": [{"name": "RENDR", "code": "RENDR.KUNAV1", "legs": [{"t": "F", "n": "RENDR"}, {"t": "T", "d": 180}, {"t": "F", "n": "WELSH"}, {"t": "H", "n": "KENED"}, {"t": "F", "n": "KENED"}, {"t": "F", "n": "KUNAV", "alt": "2000"}]}, {"name": "DINER", "code": "DINER.KUNAV1", "legs": [{"t": "F", "n": "DINER"}, {"t": "T", "d": 210}, {"t": "F", "n": "SURGE", "alt": "1000"}, {"t": "T", "d": 243}, {"t": "F", "n": "INDEX"}, {"t": "T", "d": 235}, {"t": "F", "n": "KENED"}, {"t": "F", "n": "KUNAV", "alt": "2000"}]}], "rwyProcs": [{"rwys": ["07L", "07C", "07R"], "legs": [{"t": "T", "d": 230}, {"t": "F", "n": "BRIDGE"}, {"t": "T", "d": 190}, {"t": "F", "n": "ALISO"}, {"t": "T", "d": 115}]}, {"rwys": ["25L", "25C", "25R"], "legs": [{"t": "T", "d": 120}, {"t": "F", "n": "HAWFA"}, {"t": "T", "d": 130}, {"t": "F", "n": "SWEET", "alt": "1500"}, {"t": "T", "d": 70}]}]}, {"name": "SUNST 3 RNAV ARRIVAL", "code": "SUNST.SUNST3", "entryTransitions": [], "rwyProcs": [{"rwys": ["07L", "07C", "07R"], "legs": [{"t": "F", "n": "SUNST"}, {"t": "T", "d": 160}, {"t": "F", "n": "LAAMP", "alt": "1000"}, {"t": "T", "d": 160}, {"t": "F", "n": "LOGAN", "alt": "1000"}]}, {"rwys": ["25L", "25C", "25R"], "legs": [{"t": "F", "n": "SUNST"}, {"t": "T", "d": 120}, {"t": "F", "n": "BUCFA", "alt": "2000 (hard altitude)"}, {"t": "T", "d": 103}, {"t": "F", "n": "HAWFA", "alt": "1000"}, {"t": "T", "d": 103}, {"t": "F", "n": "SWEET", "alt": "at or below 1500"}, {"t": "T", "d": 67}]}]}, {"name": "GORDO 1 ARRIVAL", "code": "GORDO.GORDO1", "entryTransitions": [], "rwyProcs": [{"rwys": ["07L", "07C"], "legs": [{"t": "F", "n": "SKP"}, {"t": "F", "n": "MOSSY"}, {"t": "T", "d": 247}, {"t": "F", "n": "GORDO"}, {"t": "F", "n": "GODLU"}, {"t": "F", "n": "TRN"}]}]}], "ITKO": [{"name": "GULEG 1 RNAV ARRIVAL", "code": "GULEG.GULEG1", "entryTransitions": [{"name": "BLANK", "code": "BLANK.GULEG1", "legs": [{"t": "F", "n": "BLANK"}, {"t": "T", "d": 30}, {"t": "F", "n": "GULEG", "alt": "2000"}]}, {"name": "EURAD", "code": "EURAD.GULEG1", "legs": [{"t": "F", "n": "EURAD"}, {"t": "T", "d": 80}, {"t": "F", "n": "GULEG", "alt": "2000"}]}], "rwyProcs": [{"rwys": ["13"], "legs": [{"t": "T", "d": 15}, {"t": "F", "n": "SHIBA"}]}, {"rwys": ["20", "31"], "legs": [{"t": "T", "d": 95}, {"t": "F", "n": "PIPER"}, {"t": "T", "d": 100}, {"t": "F", "n": "ONDER"}, {"t": "T", "d": 15}]}]}, {"name": "ISLAND 2 RNAV ARRIVAL", "code": "HONDA.ISLND1", "entryTransitions": [], "rwyProcs": [{"rwys": ["13"], "legs": [{"t": "T", "d": 260}, {"t": "F", "n": "ONDER", "alt": "2000"}, {"t": "T", "d": 280}, {"t": "F", "n": "PIPER"}, {"t": "T", "d": 340}, {"t": "F", "n": "ASTRO"}]}, {"rwys": ["20"], "legs": [{"t": "T", "d": 340}]}]}, {"name": "KNIFE 2 RNAV ARRIVAL", "code": "ONDER.KNIFE1", "entryTransitions": [{"name": "PROBE", "code": "PROBE.KNIFE1", "legs": [{"t": "F", "n": "PROBE"}, {"t": "T", "d": 45}, {"t": "F", "n": "ONDER", "alt": "2000"}]}, {"name": "DINER", "code": "DINER.KNIFE1", "legs": [{"t": "F", "n": "DINER"}, {"t": "T", "d": 325}, {"t": "F", "n": "ONDER", "alt": "2000"}]}], "rwyProcs": [{"rwys": ["20"], "legs": [{"t": "T", "d": 80}, {"t": "F", "n": "KNIFE"}, {"t": "T", "d": 360}]}]}, {"name": "PIPER 1 RNAV ARRIVAL", "code": "PIPER.PIPER1", "entryTransitions": [{"name": "RENDR", "code": "RENDR.PIPER1", "legs": [{"t": "F", "n": "RENDR"}, {"t": "T", "d": 45}, {"t": "F", "n": "PIPER", "alt": "2000"}]}, {"name": "DINER", "code": "DINER.PIPER1", "legs": [{"t": "F", "n": "DINER"}, {"t": "T", "d": 325}, {"t": "F", "n": "ONDER"}, {"t": "T", "d": 280}, {"t": "F", "n": "PIPER", "alt": "2000"}]}], "rwyProcs": [{"rwys": ["13"], "legs": [{"t": "T", "d": 340}, {"t": "F", "n": "ASTRO"}]}]}]}, "waypoints": ["ABSRS", "ACRES", "ALDER", "ALTRS", "ANYMS", "AQWRT", "ASTRO", "ATPEV", "BEANS", "BILLO", "BLANK", "BOBOS", "BOBUX", "BUCFA", "BULLY", "CAMEL", "CAWZE", "CELAR", "CHAIN", "CHILY", "CRAZY", "CYRIL", "DEATH", "DEBUG", "DINER", "DOGGO", "DUNKS", "EMJAY", "ENDER", "EXMOR", "EZYDB", "FORCE", "FORIA", "FROOT", "GAVIN", "GODLU", "GRASS", "GULEG", "HACKE", "HAWFA", "HOGGS", "HONDA", "ICTAM", "INDEX", "JACKI", "JAMSI", "JAZZR", "JUSTY", "KELLA", "KENED", "KNIFE", "KUNAV", "LAVNO", "LAZER", "LETSE", "LLIME", "LOGAN", "MASEV", "MOGTA", "MORRD", "MUONE", "NIKON", "NOONU", "NUBER", "OCEEN", "ODOKU", "ONDER", "PACKT", "PEPUL", "PIPER", "PROBE", "REAPR", "RENTS", "ROBUX", "ROSMO", "SAWPE", "SEEKS", "SETHR", "SHELL", "SHIBA", "SHREK", "SILVA", "SISTA", "SPACE", "SQUID", "STACK", "STRAX", "SUNST", "TALIS", "THACC", "THENR", "TINDR", "TRELN", "UDMUG", "UWAIS", "WAGON", "WASTE", "WELLS", "WELSH", "WOTAN", "YOUTH", "ZESTA"], "navaids": [{"name": "GRINDAVIK", "ident": "GVK", "freq": "112.320", "type": "VOR"}, {"name": "MELLOR", "ident": "MLR", "freq": "114.75", "type": "VOR"}, {"name": "GARRY", "ident": "GRY", "freq": "111.90", "type": "VOR"}, {"name": "SAUTHEMPTONA", "ident": "SAU", "freq": "115.35", "type": "VOR"}, {"name": "ROCKFORD", "ident": "RFD", "freq": "113.55", "type": "VOR"}, {"name": "BLADES", "ident": "BLA", "freq": "117.45", "type": "VOR"}, {"name": "TRAINING CENTRE", "ident": "TRN", "freq": "113.10", "type": "VOR"}, {"name": "LARNACA", "ident": "LCK", "freq": "112.80", "type": "VOR"}, {"name": "PAPHOS", "ident": "PFO", "freq": "117.90", "type": "VOR"}, {"name": "IZOLIRANI", "ident": "IZO", "freq": "117.530", "type": "VOR"}, {"name": "PERTH", "ident": "PER", "freq": "115.430", "type": "VOR"}, {"name": "NAJAF", "ident": "NJF", "freq": "112.45", "type": "VOR"}, {"name": "HANEDA", "ident": "HME", "freq": "112.20", "type": "VOR"}, {"name": "HAWKIN", "ident": "HAW", "type": "NDB"}, {"name": "GOLDEN", "ident": "GOL", "type": "NDB"}, {"name": "CROIS NOOB", "ident": "COC", "type": "NDB"}, {"name": "BRAINSTORM", "ident": "BTM", "type": "NDB"}, {"name": "ORANGE", "ident": "ORG", "type": "NDB"}, {"name": "HOTDOG", "ident": "HOT", "type": "NDB"}, {"name": "RESURGE", "ident": "RES", "type": "NDB"}, {"name": "ROMENS", "ident": "ROM", "type": "NDB"}, {"name": "DELIVERY", "ident": "DEL", "type": "NDB"}, {"name": "CLEARANCE", "ident": "CLR", "type": "NDB"}, {"name": "DETOX", "ident": "DET", "type": "NDB"}, {"name": "KINDLE", "ident": "KIN", "type": "NDB"}, {"name": "CANDLE", "ident": "CAN", "type": "NDB"}, {"name": "HUNTER", "ident": "HUT", "type": "NDB"}, {"name": "DIRECTOR", "ident": "DIR", "type": "NDB"}, {"name": "KROTEN", "ident": "KRT", "type": "NDB"}, {"name": "TRESIN", "ident": "TRE", "type": "NDB"}, {"name": "DIZZIER", "ident": "DIZ", "type": "NDB"}, {"name": "Skopelos", "ident": "SKP", "freq": "113.4", "type": "VOR"}], "airports": [{"icao": "ITKO", "name": "Haneda"}, {"icao": "IPPH", "name": "Perth"}, {"icao": "ILKL", "name": ""}, {"icao": "ISCM", "name": "Hotdog Fld"}, {"icao": "IJAF", "name": "Najaf"}, {"icao": "IZOL", "name": "Izolirani"}, {"icao": "IGRV", "name": "Grindavik Island"}, {"icao": "IMLR", "name": "Mellor Intl"}, {"icao": "IRFD", "name": "New Rockford Intl"}, {"icao": "ISAU", "name": "Sauthemptona Regl"}, {"icao": "IBLT", "name": "Boltic Airfield"}, {"icao": "IBTH", "name": "Saint Barthelemy"}, {"icao": "ITRC", "name": "Rockford Training Center"}, {"icao": "ISKP", "name": "Skopelos Airfield"}, {"icao": "ILAR", "name": "Larnaca Intl"}, {"icao": "IPAP", "name": "Paphos Intl"}, {"icao": "IBAR", "name": ""}, {"icao": "IIAB", "name": ""}, {"icao": "IHEN", "name": ""}, {"icao": "IBTH", "name": "Saint Barthelemy"}, {"icao": "IBLT", "name": "Boltic Airfield"}, {"icao": "IGAR", "name": "Garry AFB"}], "runwaysByAirport": {"IRFD": ["07L", "07C", "07R", "25L", "25C", "25R"], "ITKO": ["02", "13", "20", "31"]}};

// ---------- helpers ----------

function normalizeAirports() {
  const list = [{ icao: "IRFD", name: "New Rockford Intl" }];
  RFD_DATA.airports.forEach((a) => {
    if (a.icao !== "IRFD") list.push({ icao: a.icao, name: a.name || a.icao });
  });
  return list;
}
const AIRPORTS = normalizeAirports();
const AIRPORTS_WITH_DATA = Object.keys(RFD_DATA.sids); // airports that have any procedure data at all
function runwaysFor(icao) {
  return (RFD_DATA.runwaysByAirport && RFD_DATA.runwaysByAirport[icao]) || [];
}

// some charts (e.g. WNNDY3) give one universal instruction with no per-runway
// breakdown - stored as rwys:['ALL'], which should match any selected runway.
function rwysMatch(rwys, rwy) {
  return rwys.includes("ALL") || rwys.includes(rwy);
}

function sidsForRunway(icao, rwy) {
  const list = (RFD_DATA.sids && RFD_DATA.sids[icao]) || [];
  return list.filter((s) => s.rwyProcs.some((rp) => rwysMatch(rp.rwys, rwy)));
}
function starsForRunway(icao, rwy) {
  const list = (RFD_DATA.stars && RFD_DATA.stars[icao]) || [];
  return list.filter((s) => s.rwyProcs.some((rp) => rwysMatch(rp.rwys, rwy)));
}

// turn a raw token stream [{t:'F',n,alt}|{t:'T',d}|{t:'H',n}] into ordered nodes
function tokensToNodes(tokens, phase) {
  const nodes = [];
  let pendingTrack = null;
  let pendingHold = null;
  (tokens || []).forEach((tok) => {
    if (tok.t === "T") pendingTrack = tok.d;
    else if (tok.t === "H") pendingHold = tok.n;
    else if (tok.t === "F") {
      nodes.push({
        name: tok.n,
        trackIn: pendingTrack,
        alt: tok.alt || null,
        phase,
        hold: pendingHold === tok.n ? true : false,
      });
      pendingTrack = null;
      pendingHold = null;
    }
  });
  return nodes;
}

// dedupe consecutive nodes with the same fix name (keep the richer one)
function dedupeNodes(nodes) {
  const out = [];
  for (const n of nodes) {
    const prev = out[out.length - 1];
    if (prev && prev.name === n.name) {
      if (n.trackIn != null && prev.trackIn == null) prev.trackIn = n.trackIn;
      if (n.alt && !prev.alt) prev.alt = n.alt;
      continue;
    }
    out.push({ ...n });
  }
  return out;
}

function buildRoute(cfg) {
  const {
    adep, adepRwy, sidIdx, sidTransIdx,
    enrouteFixes,
    starIdx, starTransIdx,
    ades, adesRwy,
  } = cfg;

  let nodes = [];
  let sidCodeStr = null;
  let starCodeStr = null;

  if (RFD_DATA.sids[adep] && sidIdx != null) {
    const sid = RFD_DATA.sids[adep][sidIdx];
    const rp = sid.rwyProcs.find((r) => rwysMatch(r.rwys, adepRwy));
    const rpNodes = tokensToNodes(rp ? rp.legs : [], "SID");
    nodes.push({ name: adep, trackIn: null, alt: null, phase: "DEP", isAirport: true });
    nodes.push(...rpNodes);
    if (sidTransIdx != null) {
      const trans = sid.transitions[sidTransIdx];
      nodes.push(...tokensToNodes(trans.legs, "SID"));
      sidCodeStr = trans.code;
    } else {
      sidCodeStr = sid.code;
    }
  } else {
    nodes.push({ name: adep, trackIn: null, alt: null, phase: "DEP", isAirport: true });
  }

  enrouteFixes.forEach((f) => {
    nodes.push({ name: f, trackIn: null, alt: null, phase: "ENROUTE" });
  });

  if (RFD_DATA.stars[ades] && starIdx != null) {
    const star = RFD_DATA.stars[ades][starIdx];
    if (starTransIdx != null && star.entryTransitions[starTransIdx]) {
      const trans = star.entryTransitions[starTransIdx];
      nodes.push(...tokensToNodes(trans.legs, "STAR"));
      starCodeStr = trans.code;
    } else {
      starCodeStr = star.code;
    }
    const rp = star.rwyProcs.find((r) => rwysMatch(r.rwys, adesRwy));
    nodes.push(...tokensToNodes(rp ? rp.legs : [], "STAR"));
  }
  nodes.push({ name: ades, trackIn: null, alt: null, phase: "ARR", isAirport: true });

  nodes = dedupeNodes(nodes);

  const enrouteNames = enrouteFixes.length ? enrouteFixes.join(" DCT ") : null;
  const parts = [
    `${adep}/${adepRwy || "?"}`,
    sidCodeStr,
    enrouteNames,
    starCodeStr,
    `${adesRwy ? adesRwy + "/" : ""}${ades}`,
  ].filter(Boolean);

  return { nodes, routeString: parts.join(" ") };
}

// find which leg (index of the *arriving* node) best matches a live heading/altitude
function matchCurrentLegIndex(nodes, heading, altitude) {
  let best = -1;
  let bestScore = Infinity;
  for (let i = 1; i < nodes.length; i++) {
    const n = nodes[i];
    if (n.trackIn == null) continue;
    let diff = Math.abs(((heading - n.trackIn + 540) % 360) - 180);
    best === -1 && (bestScore = diff);
    if (diff <= bestScore) {
      bestScore = diff;
      best = i;
    }
  }
  return best === -1 ? Math.min(1, nodes.length - 1) : best;
}

const PHASE_COLOR = {
  DEP: "var(--text-dim)",
  SID: "var(--amber)",
  ENROUTE: "var(--text)",
  STAR: "var(--cyan)",
  ARR: "var(--text-dim)",
};

// ---------- small UI atoms ----------

function Select({ value, onChange, options, placeholder, disabled }) {
  return (
    <div className="gw-select-wrap">
      <select
        className="gw-select"
        value={value ?? ""}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value === "" ? null : e.target.value)}
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <ChevronDown size={13} className="gw-select-chevron" />
    </div>
  );
}

function FixPicker({ fixes, onAdd, onRemove }) {
  const [q, setQ] = useState("");
  const all = useMemo(() => {
    const wp = RFD_DATA.waypoints.map((w) => ({ name: w, kind: "FIX" }));
    const nv = RFD_DATA.navaids.map((n) => ({ name: n.ident, kind: n.type, full: n.name }));
    return [...nv, ...wp];
  }, []);
  const matches = useMemo(() => {
    if (!q.trim()) return [];
    const qq = q.trim().toUpperCase();
    return all.filter((f) => f.name.startsWith(qq)).slice(0, 8);
  }, [q, all]);

  return (
    <div className="gw-fixpicker">
      <div className="gw-chips">
        {fixes.map((f, i) => (
          <span className="gw-chip" key={f + i}>
            {f}
            <X size={11} className="gw-chip-x" onClick={() => onRemove(i)} />
          </span>
        ))}
      </div>
      <div className="gw-fixinput-wrap">
        <input
          className="gw-input"
          placeholder="Add enroute fix / navaid…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && q.trim()) {
              onAdd(q.trim().toUpperCase());
              setQ("");
            }
          }}
        />
        {matches.length > 0 && (
          <div className="gw-suggest">
            {matches.map((m) => (
              <div
                key={m.name}
                className="gw-suggest-row"
                onClick={() => { onAdd(m.name); setQ(""); }}
              >
                <span className="gw-suggest-name">{m.name}</span>
                <span className="gw-suggest-kind">{m.kind}{m.full ? ` · ${m.full}` : ""}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="gw-field">
      <label className="gw-field-label">{label}</label>
      {children}
    </div>
  );
}

// ---------- route tape (signature visual) ----------

function RouteTape({ nodes, currentIdx }) {
  const scrollRef = useRef(null);
  useEffect(() => {
    if (!scrollRef.current) return;
    const el = scrollRef.current.querySelector(`[data-idx="${currentIdx}"]`);
    if (el) el.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [currentIdx]);

  if (!nodes.length) {
    return <div className="gw-tape-empty">Build a route to see the progress tape.</div>;
  }

  return (
    <div className="gw-tape" ref={scrollRef}>
      <div className="gw-tape-track">
        {nodes.map((n, i) => {
          const isPast = i < currentIdx;
          const isCurrent = i === currentIdx;
          const segColor = PHASE_COLOR[n.phase] || "var(--text-dim)";
          return (
            <React.Fragment key={i}>
              {i > 0 && (
                <div
                  className="gw-tape-line"
                  style={{
                    background: isCurrent
                      ? "var(--magenta)"
                      : isPast
                      ? "var(--green)"
                      : segColor,
                    opacity: isPast || isCurrent ? 1 : 0.45,
                  }}
                />
              )}
              <div className="gw-tape-node-wrap" data-idx={i}>
                {isCurrent && (
                  <div className="gw-tape-plane">
                    <Plane size={16} style={{ transform: "rotate(90deg)" }} />
                  </div>
                )}
                <div
                  className={
                    "gw-tape-node" +
                    (n.isAirport ? " gw-tape-node-apt" : "") +
                    (n.hold ? " gw-tape-node-hold" : "")
                  }
                  style={{
                    borderColor: isPast ? "var(--green)" : isCurrent ? "var(--magenta)" : segColor,
                    background: isPast ? "var(--green-dim)" : isCurrent ? "var(--magenta-dim)" : "var(--panel-2)",
                  }}
                  title={n.alt || ""}
                >
                  {n.isAirport ? n.name : n.name.slice(0, 5)}
                </div>
                <div className="gw-tape-alt">{n.alt || ""}</div>
                {n.trackIn != null && <div className="gw-tape-track-label">{String(n.trackIn).padStart(3, "0")}°</div>}
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

function LegTable({ nodes, currentIdx }) {
  return (
    <div className="gw-legtable">
      <div className="gw-legtable-head">
        <span>#</span><span>FIX</span><span>PHASE</span><span>TRACK</span><span>ALT</span>
      </div>
      <div className="gw-legtable-body">
        {nodes.map((n, i) => (
          <div
            key={i}
            className={"gw-legrow" + (i === currentIdx ? " gw-legrow-current" : i < currentIdx ? " gw-legrow-past" : "")}
          >
            <span className="gw-legrow-idx">{i + 1}</span>
            <span className="gw-legrow-fix">{n.name}{n.hold ? " (HOLD)" : ""}</span>
            <span className="gw-legrow-phase" style={{ color: PHASE_COLOR[n.phase] }}>{n.phase}</span>
            <span className="gw-legrow-track">{n.trackIn != null ? String(n.trackIn).padStart(3, "0") + "°" : "—"}</span>
            <span className="gw-legrow-alt">{n.alt || "—"}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------- main app ----------

export default function Gateway() {
  const [adep, setAdep] = useState("IRFD");
  const [adepRwy, setAdepRwy] = useState("25L");
  const [sidIdx, setSidIdx] = useState(null);
  const [sidTransIdx, setSidTransIdx] = useState(null);
  const [enrouteFixes, setEnrouteFixes] = useState([]);
  const [ades, setAdes] = useState("IRFD");
  const [adesRwy, setAdesRwy] = useState("07L");
  const [starIdx, setStarIdx] = useState(null);
  const [starTransIdx, setStarTransIdx] = useState(null);
  const [built, setBuilt] = useState(null);

  const [mode, setMode] = useState("sim"); // 'sim' | 'live'
  const [simPlaying, setSimPlaying] = useState(false);
  const [simIdx, setSimIdx] = useState(0);
  const [robloxName, setRobloxName] = useState("");
  const [backendUrl, setBackendUrl] = useState("http://localhost:8420");
  const [liveStatus, setLiveStatus] = useState("idle"); // idle | connecting | live | error
  const [liveAircraft, setLiveAircraft] = useState(null);

  const availableSids = useMemo(() => sidsForRunway(adep, adepRwy), [adep, adepRwy]);
  const availableStars = useMemo(() => (RFD_DATA.stars[ades] ? starsForRunway(ades, adesRwy) : []), [ades, adesRwy]);

  useEffect(() => {
    const rwys = runwaysFor(adep);
    setAdepRwy(rwys[0] || null);
    setSidIdx(null); setSidTransIdx(null);
  }, [adep]);
  useEffect(() => {
    const rwys = runwaysFor(ades);
    setAdesRwy(rwys[0] || null);
    setStarIdx(null); setStarTransIdx(null);
  }, [ades]);

  useEffect(() => { setSidIdx(null); setSidTransIdx(null); }, [adepRwy]);
  useEffect(() => { setStarIdx(null); setStarTransIdx(null); }, [adesRwy, ades]);

  const handleBuild = () => {
    const result = buildRoute({
      adep, adepRwy, sidIdx, sidTransIdx,
      enrouteFixes, starIdx, starTransIdx, ades, adesRwy,
    });
    setBuilt(result);
    setSimIdx(0);
    setSimPlaying(false);
  };

  // simulation playback
  useEffect(() => {
    if (!simPlaying || !built) return;
    const id = setInterval(() => {
      setSimIdx((i) => {
        if (i >= built.nodes.length - 1) { setSimPlaying(false); return i; }
        return i + 1;
      });
    }, 2200);
    return () => clearInterval(id);
  }, [simPlaying, built]);

  // live polling
  useEffect(() => {
    if (mode !== "live" || !robloxName || !backendUrl) return;
    let cancelled = false;
    setLiveStatus("connecting");
    const poll = async () => {
      try {
        const res = await fetch(`${backendUrl.replace(/\/$/, "")}/aircraft/${encodeURIComponent(robloxName)}`, { mode: "cors" });
        if (!res.ok) throw new Error("not found");
        const data = await res.json();
        if (cancelled) return;
        setLiveAircraft(data);
        setLiveStatus("live");
      } catch (e) {
        if (cancelled) return;
        setLiveStatus("error");
      }
    };
    poll();
    const id = setInterval(poll, 3000);
    return () => { cancelled = true; clearInterval(id); };
  }, [mode, robloxName, backendUrl]);

  const currentIdx = useMemo(() => {
    if (!built) return 0;
    if (mode === "live" && liveAircraft && liveStatus === "live") {
      return matchCurrentLegIndex(built.nodes, liveAircraft.heading, liveAircraft.altitude);
    }
    return simIdx;
  }, [built, mode, liveAircraft, liveStatus, simIdx]);

  const currentNode = built ? built.nodes[currentIdx] : null;
  const nextNode = built ? built.nodes[currentIdx + 1] : null;

  return (
    <div className="gw-root">
      <style>{CSS}</style>

      <header className="gw-header">
        <div className="gw-brand">
          <Navigation2 size={20} strokeWidth={2.2} />
          <span className="gw-brand-text">GATEWAY</span>
          <span className="gw-brand-tag">route planning · atc24</span>
        </div>
        <div className="gw-modepick">
          <button className={"gw-modebtn" + (mode === "sim" ? " active" : "")} onClick={() => setMode("sim")}>SIMULATE</button>
          <button className={"gw-modebtn" + (mode === "live" ? " active" : "")} onClick={() => setMode("live")}>LIVE</button>
        </div>
      </header>

      <div className="gw-body">
        {/* ---- left: builder ---- */}
        <div className="gw-panel gw-builder">
          <div className="gw-panel-title">FLIGHT PLAN</div>

          <div className="gw-row2">
            <Field label="DEPARTURE">
              <Select value={adep} onChange={setAdep} options={AIRPORTS.map((a) => ({ value: a.icao, label: `${a.icao}${a.name ? " · " + a.name : ""}` }))} placeholder="Airport" />
            </Field>
            <Field label="RWY">
              <Select value={adepRwy} onChange={setAdepRwy} options={runwaysFor(adep).map((r) => ({ value: r, label: r }))} placeholder="—" disabled={runwaysFor(adep).length === 0} />
            </Field>
          </div>

          {RFD_DATA.sids[adep] ? (
            <>
              <Field label="SID">
                <Select
                  value={sidIdx}
                  onChange={(v) => { setSidIdx(v === null ? null : Number(v)); setSidTransIdx(null); }}
                  options={availableSids.map((s) => ({ value: RFD_DATA.sids[adep].indexOf(s), label: s.name }))}
                  placeholder="No SID (vectors)"
                />
              </Field>
              {sidIdx != null && RFD_DATA.sids[adep][sidIdx].transitions.length > 0 && (
                <Field label="SID TRANSITION">
                  <Select
                    value={sidTransIdx}
                    onChange={(v) => setSidTransIdx(v === null ? null : Number(v))}
                    options={RFD_DATA.sids[adep][sidIdx].transitions.map((t, i) => ({ value: i, label: t.name }))}
                    placeholder="Select transition"
                  />
                </Field>
              )}
            </>
          ) : (
            <div className="gw-note">No published SID data for {adep} yet — direct routing only.</div>
          )}

          <Field label="ENROUTE (free route — no fixed airways in ATC24)">
            <FixPicker
              fixes={enrouteFixes}
              onAdd={(f) => setEnrouteFixes((arr) => [...arr, f])}
              onRemove={(i) => setEnrouteFixes((arr) => arr.filter((_, idx) => idx !== i))}
            />
          </Field>

          <div className="gw-row2">
            <Field label="ARRIVAL">
              <Select value={ades} onChange={setAdes} options={AIRPORTS.map((a) => ({ value: a.icao, label: `${a.icao}${a.name ? " · " + a.name : ""}` }))} placeholder="Airport" />
            </Field>
            <Field label="RWY">
              <Select value={adesRwy} onChange={setAdesRwy} options={runwaysFor(ades).map((r) => ({ value: r, label: r }))} placeholder="—" disabled={runwaysFor(ades).length === 0} />
            </Field>
          </div>

          {RFD_DATA.stars[ades] ? (
            <>
              <Field label="STAR">
                <Select
                  value={starIdx}
                  onChange={(v) => { setStarIdx(v === null ? null : Number(v)); setStarTransIdx(null); }}
                  options={availableStars.map((s) => ({ value: RFD_DATA.stars[ades].indexOf(s), label: s.name }))}
                  placeholder="No STAR (vectors)"
                />
              </Field>
              {starIdx != null && RFD_DATA.stars[ades][starIdx].entryTransitions.length > 0 && (
                <Field label="STAR TRANSITION">
                  <Select
                    value={starTransIdx}
                    onChange={(v) => setStarTransIdx(v === null ? null : Number(v))}
                    options={RFD_DATA.stars[ades][starIdx].entryTransitions.map((t, i) => ({ value: i, label: t.name }))}
                    placeholder="Select transition"
                  />
                </Field>
              )}
            </>
          ) : (
            <div className="gw-note">No published STAR data for {ades} yet — direct routing only.</div>
          )}

          <button className="gw-buildbtn" onClick={handleBuild}>
            BUILD ROUTE <ChevronRight size={14} />
          </button>
        </div>

        {/* ---- right: readout ---- */}
        <div className="gw-main">
          <div className="gw-panel gw-routestring">
            <div className="gw-panel-title">ROUTE STRING</div>
            <div className="gw-routestring-text">{built ? built.routeString : "— build a route to see it here —"}</div>
          </div>

          <div className="gw-panel">
            <div className="gw-panel-title-row">
              <span className="gw-panel-title">PROGRESS</span>
              {mode === "sim" ? (
                <div className="gw-simctl">
                  <button className="gw-iconbtn" onClick={() => setSimPlaying((p) => !p)} disabled={!built}>
                    {simPlaying ? <Pause size={13} /> : <Play size={13} />}
                  </button>
                  <button className="gw-iconbtn" onClick={() => { setSimIdx(0); setSimPlaying(false); }} disabled={!built}>
                    <RotateCcw size={13} />
                  </button>
                </div>
              ) : (
                <div className="gw-livestatus">
                  {liveStatus === "live" ? <Wifi size={13} color="var(--green)" /> : <WifiOff size={13} color="var(--text-dim)" />}
                  <span>{liveStatus.toUpperCase()}</span>
                </div>
              )}
            </div>

            {mode === "live" && (
              <div className="gw-liveform">
                <input className="gw-input" placeholder="Roblox username" value={robloxName} onChange={(e) => setRobloxName(e.target.value)} />
                <input className="gw-input" placeholder="Backend URL (your Node relay)" value={backendUrl} onChange={(e) => setBackendUrl(e.target.value)} />
                {liveStatus === "error" && (
                  <div className="gw-note gw-note-warn">
                    Couldn't reach a backend at that URL. A browser can't talk to 24data directly (CORS) —
                    this needs your own small relay server. Switch to SIMULATE to preview the UI, or run the
                    provided backend and point this at it.
                  </div>
                )}
              </div>
            )}

            <RouteTape nodes={built ? built.nodes : []} currentIdx={currentIdx} />

            {built && currentNode && (
              <div className="gw-nownext">
                <div className="gw-now">
                  <div className="gw-now-label">AT</div>
                  <div className="gw-now-fix">{currentNode.name}</div>
                </div>
                <ChevronRight size={16} color="var(--text-dim)" />
                {nextNode ? (
                  <div className="gw-now">
                    <div className="gw-now-label">NEXT — {nextNode.trackIn != null ? `TURN TO ${String(nextNode.trackIn).padStart(3, "0")}°` : "DIRECT"}</div>
                    <div className="gw-now-fix">{nextNode.name}{nextNode.alt ? ` · ${nextNode.alt}` : ""}</div>
                  </div>
                ) : (
                  <div className="gw-now"><div className="gw-now-fix">END OF ROUTE</div></div>
                )}
              </div>
            )}

            <LegTable nodes={built ? built.nodes : []} currentIdx={currentIdx} />
          </div>
        </div>
      </div>
    </div>
  );
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500;600&display=swap');

.gw-root {
  --bg: #0A0E13;
  --panel: #121820;
  --panel-2: #1A2229;
  --border: #263139;
  --text: #E7EDF3;
  --text-dim: #7E8FA0;
  --amber: #F2A93B;
  --cyan: #49C7E8;
  --magenta: #F0529E;
  --magenta-dim: rgba(240, 82, 158, 0.16);
  --green: #52D68A;
  --green-dim: rgba(82, 214, 138, 0.14);
  --red: #D8524A;

  background: var(--bg);
  color: var(--text);
  font-family: 'IBM Plex Sans', sans-serif;
  min-height: 100vh;
  padding: 18px;
  box-sizing: border-box;
}
.gw-root * { box-sizing: border-box; }

.gw-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 4px 4px 16px 4px; border-bottom: 1px solid var(--border); margin-bottom: 16px;
}
.gw-brand { display: flex; align-items: center; gap: 9px; color: var(--amber); }
.gw-brand-text { font-family: 'Space Grotesk', sans-serif; font-weight: 700; font-size: 19px; letter-spacing: 0.04em; color: var(--text); }
.gw-brand-tag { font-size: 11px; color: var(--text-dim); font-family: 'IBM Plex Mono', monospace; letter-spacing: 0.02em; margin-left: 2px; }
.gw-modepick { display: flex; gap: 2px; background: var(--panel-2); border: 1px solid var(--border); border-radius: 4px; padding: 2px; }
.gw-modebtn { background: transparent; border: none; color: var(--text-dim); font-family: 'IBM Plex Mono', monospace; font-size: 11px; letter-spacing: 0.06em; padding: 6px 12px; border-radius: 3px; cursor: pointer; }
.gw-modebtn.active { background: var(--amber); color: #1A1200; font-weight: 600; }

.gw-body { display: grid; grid-template-columns: 300px 1fr; gap: 16px; align-items: start; }
@media (max-width: 860px) { .gw-body { grid-template-columns: 1fr; } }

.gw-panel { background: var(--panel); border: 1px solid var(--border); border-radius: 5px; padding: 14px; margin-bottom: 16px; }
.gw-panel-title { font-family: 'IBM Plex Mono', monospace; font-size: 11px; letter-spacing: 0.1em; color: var(--text-dim); margin-bottom: 12px; }
.gw-panel-title-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px; }

.gw-builder { position: sticky; top: 18px; }
.gw-row2 { display: grid; grid-template-columns: 1fr 84px; gap: 8px; }
.gw-field { margin-bottom: 11px; }
.gw-field-label { display: block; font-size: 10px; letter-spacing: 0.06em; color: var(--text-dim); margin-bottom: 5px; font-family: 'IBM Plex Mono', monospace; }

.gw-select-wrap { position: relative; }
.gw-select {
  width: 100%; background: var(--panel-2); border: 1px solid var(--border); color: var(--text);
  font-family: 'IBM Plex Sans', sans-serif; font-size: 12.5px; padding: 8px 26px 8px 9px; border-radius: 4px;
  appearance: none; cursor: pointer;
}
.gw-select:disabled { opacity: 0.45; cursor: not-allowed; }
.gw-select-chevron { position: absolute; right: 8px; top: 50%; transform: translateY(-50%); pointer-events: none; color: var(--text-dim); }

.gw-input {
  width: 100%; background: var(--panel-2); border: 1px solid var(--border); color: var(--text);
  font-family: 'IBM Plex Mono', monospace; font-size: 12px; padding: 8px 9px; border-radius: 4px;
}
.gw-input::placeholder { color: var(--text-dim); font-family: 'IBM Plex Sans', sans-serif; }

.gw-note { font-size: 11.5px; color: var(--text-dim); line-height: 1.5; padding: 8px 10px; background: var(--panel-2); border-radius: 4px; border: 1px dashed var(--border); margin-bottom: 11px; }
.gw-note-warn { border-color: var(--amber); color: var(--amber); margin-top: 8px; }

.gw-fixpicker { }
.gw-chips { display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 6px; }
.gw-chip { display: inline-flex; align-items: center; gap: 5px; background: var(--panel-2); border: 1px solid var(--border); color: var(--text); font-family: 'IBM Plex Mono', monospace; font-size: 11px; padding: 4px 6px 4px 9px; border-radius: 3px; }
.gw-chip-x { cursor: pointer; color: var(--text-dim); }
.gw-chip-x:hover { color: var(--red); }
.gw-fixinput-wrap { position: relative; }
.gw-suggest { position: absolute; z-index: 20; top: calc(100% + 3px); left: 0; right: 0; background: var(--panel-2); border: 1px solid var(--border); border-radius: 4px; overflow: hidden; box-shadow: 0 6px 18px rgba(0,0,0,0.4); }
.gw-suggest-row { display: flex; justify-content: space-between; padding: 7px 9px; cursor: pointer; font-size: 12px; }
.gw-suggest-row:hover { background: var(--bg); }
.gw-suggest-name { font-family: 'IBM Plex Mono', monospace; color: var(--text); }
.gw-suggest-kind { color: var(--text-dim); font-size: 10.5px; }

.gw-buildbtn {
  width: 100%; background: var(--amber); color: #1A1200; border: none; border-radius: 4px;
  padding: 10px; font-family: 'IBM Plex Mono', monospace; font-weight: 600; font-size: 12px; letter-spacing: 0.06em;
  cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 4px; margin-top: 4px;
}
.gw-buildbtn:hover { background: #FFC169; }

.gw-routestring-text { font-family: 'IBM Plex Mono', monospace; font-size: 14px; color: var(--cyan); word-break: break-word; line-height: 1.7; }

.gw-simctl { display: flex; gap: 6px; }
.gw-iconbtn { background: var(--panel-2); border: 1px solid var(--border); color: var(--text); border-radius: 4px; padding: 5px 7px; cursor: pointer; display: flex; }
.gw-iconbtn:disabled { opacity: 0.35; cursor: not-allowed; }
.gw-livestatus { display: flex; align-items: center; gap: 5px; font-family: 'IBM Plex Mono', monospace; font-size: 10.5px; color: var(--text-dim); letter-spacing: 0.06em; }
.gw-liveform { display: flex; flex-direction: column; gap: 7px; margin: 10px 0 4px 0; }

.gw-tape { overflow-x: auto; padding: 22px 6px 10px 6px; margin: 6px 0 4px 0; }
.gw-tape-empty { padding: 30px 0; text-align: center; color: var(--text-dim); font-size: 12.5px; }
.gw-tape-track { display: flex; align-items: flex-end; min-width: max-content; }
.gw-tape-line { width: 34px; height: 2px; margin-bottom: 27px; flex-shrink: 0; }
.gw-tape-node-wrap { position: relative; display: flex; flex-direction: column; align-items: center; flex-shrink: 0; }
.gw-tape-plane { position: absolute; top: -20px; color: var(--magenta); }
.gw-tape-node {
  border: 2px solid; border-radius: 4px; padding: 5px 8px; font-family: 'IBM Plex Mono', monospace; font-size: 10.5px;
  font-weight: 600; white-space: nowrap; color: var(--text);
}
.gw-tape-node-apt { border-radius: 50%; padding: 8px 10px; }
.gw-tape-node-hold::after { content: 'H'; }
.gw-tape-alt { font-size: 9px; color: var(--text-dim); font-family: 'IBM Plex Mono', monospace; margin-top: 4px; height: 11px; }
.gw-tape-track-label { font-size: 9px; color: var(--text-dim); font-family: 'IBM Plex Mono', monospace; }

.gw-nownext { display: flex; align-items: center; gap: 12px; background: var(--panel-2); border: 1px solid var(--border); border-radius: 4px; padding: 10px 14px; margin: 10px 0 14px 0; }
.gw-now { flex: 1; }
.gw-now-label { font-family: 'IBM Plex Mono', monospace; font-size: 9.5px; letter-spacing: 0.08em; color: var(--text-dim); margin-bottom: 3px; }
.gw-now-fix { font-family: 'IBM Plex Mono', monospace; font-size: 15px; font-weight: 600; color: var(--magenta); }

.gw-legtable { border: 1px solid var(--border); border-radius: 4px; overflow: hidden; }
.gw-legtable-head { display: grid; grid-template-columns: 30px 1fr 74px 60px 1.2fr; background: var(--panel-2); padding: 7px 10px; font-family: 'IBM Plex Mono', monospace; font-size: 9.5px; letter-spacing: 0.06em; color: var(--text-dim); }
.gw-legtable-body { max-height: 280px; overflow-y: auto; }
.gw-legrow { display: grid; grid-template-columns: 30px 1fr 74px 60px 1.2fr; padding: 7px 10px; font-size: 11.5px; border-top: 1px solid var(--border); font-family: 'IBM Plex Mono', monospace; }
.gw-legrow-idx { color: var(--text-dim); }
.gw-legrow-current { background: var(--magenta-dim); }
.gw-legrow-current .gw-legrow-fix { color: var(--magenta); font-weight: 600; }
.gw-legrow-past { opacity: 0.5; }
.gw-legrow-alt { color: var(--text-dim); font-size: 10.5px; }
`;