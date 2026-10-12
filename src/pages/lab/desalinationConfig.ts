// GENERATED from the desalination logsheet spec — edit field lists in one place (desal_spec.py) or here by hand.
// kind: 'in' number input | 'text' text input | 'calc' read-only, computed (see desalinationCalcs.ts) | 'cin' input; computed when left blank

export type DesalFieldKind = 'in' | 'text' | 'calc' | 'cin';
export type DesalSectionKey = 'uf' | 'swro' | 'bwro' | 'clarifier' | 'px' | 'productWater';
export type DesalRoute = 'uf' | 'swro' | 'bwro' | 'clarifier' | 'px' | 'productwater';

export interface DesalField { key: string; label: string; unit: string; tag: string; kind: DesalFieldKind; table: boolean }
export interface DesalGroup { title: string; fields: DesalField[] }
export interface DesalSectionConfig { key: DesalSectionKey; label: string; section: DesalRoute; groups: DesalGroup[] }

export const DESAL_SECTIONS: DesalSectionConfig[] = [
  {
    "key": "clarifier",
    "label": "Clarifier",
    "section": "clarifier",
    "groups": [
      {
        "title": "Feed Analysers",
        "fields": [
          {
            "key": "rawFeedConductivity",
            "label": "Raw Feed Conductivity",
            "unit": "mS/cm",
            "tag": "01AIT01",
            "kind": "in",
            "table": true
          },
          {
            "key": "rawFeedPh",
            "label": "Raw Feed pH",
            "unit": "",
            "tag": "01AIT01",
            "kind": "in",
            "table": true
          },
          {
            "key": "rawFeedOrp",
            "label": "Raw Feed ORP",
            "unit": "mV",
            "tag": "01AIT01",
            "kind": "in",
            "table": false
          },
          {
            "key": "rawFeedLevel",
            "label": "Raw Feed Level",
            "unit": "%",
            "tag": "01LIT01",
            "kind": "in",
            "table": false
          },
          {
            "key": "rawFeedTurbidity",
            "label": "Raw Feed Turbidity",
            "unit": "NTU",
            "tag": "01AIT01",
            "kind": "in",
            "table": true
          }
        ]
      },
      {
        "title": "Clarifier 1",
        "fields": [
          {
            "key": "c1FeedFlow",
            "label": "Feed Flow",
            "unit": "m³/h",
            "tag": "02FIT01",
            "kind": "in",
            "table": true
          },
          {
            "key": "c1OutletTurbidity",
            "label": "Outlet Turbidity",
            "unit": "NTU",
            "tag": "02AIT01",
            "kind": "in",
            "table": true
          },
          {
            "key": "c1FlocMixerSpeed",
            "label": "Flocculation Mixer Speed",
            "unit": "%",
            "tag": "",
            "kind": "in",
            "table": false
          },
          {
            "key": "c1ScraperSpeed",
            "label": "Clarifier Scraper Speed",
            "unit": "%",
            "tag": "",
            "kind": "in",
            "table": false
          },
          {
            "key": "c1FerricDosingFlow",
            "label": "Ferric Chloride Dosing Flow",
            "unit": "L/h",
            "tag": "",
            "kind": "in",
            "table": false
          },
          {
            "key": "c1PolymerDosingFlow",
            "label": "Polymer Dosing Flow",
            "unit": "L/h",
            "tag": "",
            "kind": "in",
            "table": false
          },
          {
            "key": "c1SludgeFrequency",
            "label": "Sludge Extraction Frequency",
            "unit": "",
            "tag": "",
            "kind": "in",
            "table": false
          },
          {
            "key": "c1SludgeDuration",
            "label": "Sludge Extraction Duration",
            "unit": "",
            "tag": "",
            "kind": "in",
            "table": false
          }
        ]
      },
      {
        "title": "Clarifier 2",
        "fields": [
          {
            "key": "c2FeedFlow",
            "label": "Feed Flow",
            "unit": "m³/h",
            "tag": "02FIT02",
            "kind": "in",
            "table": true
          },
          {
            "key": "c2OutletTurbidity",
            "label": "Outlet Turbidity",
            "unit": "NTU",
            "tag": "02AIT02",
            "kind": "in",
            "table": true
          },
          {
            "key": "c2FlocMixerSpeed",
            "label": "Flocculation Mixer Speed",
            "unit": "%",
            "tag": "",
            "kind": "in",
            "table": false
          },
          {
            "key": "c2ScraperSpeed",
            "label": "Clarifier Scraper Speed",
            "unit": "%",
            "tag": "",
            "kind": "in",
            "table": false
          },
          {
            "key": "c2FerricDosingFlow",
            "label": "Ferric Chloride Dosing Flow",
            "unit": "mg/L",
            "tag": "",
            "kind": "in",
            "table": false
          },
          {
            "key": "c2PolymerDosingFlow",
            "label": "Polymer Dosing Flow",
            "unit": "mg/L",
            "tag": "",
            "kind": "in",
            "table": false
          },
          {
            "key": "c2SludgeFrequency",
            "label": "Sludge Extraction Frequency",
            "unit": "",
            "tag": "",
            "kind": "in",
            "table": false
          },
          {
            "key": "c2SludgeDuration",
            "label": "Sludge Extraction Duration",
            "unit": "",
            "tag": "",
            "kind": "in",
            "table": false
          }
        ]
      },
      {
        "title": "Overall (existing fields)",
        "fields": [
          {
            "key": "influentFlow",
            "label": "Total Influent Flow",
            "unit": "m³/h",
            "tag": "",
            "kind": "cin",
            "table": false
          },
          {
            "key": "effluentTurbidity",
            "label": "Combined Effluent Turbidity",
            "unit": "NTU",
            "tag": "",
            "kind": "in",
            "table": false
          },
          {
            "key": "sludgeLevel",
            "label": "Sludge Level",
            "unit": "m",
            "tag": "",
            "kind": "in",
            "table": false
          },
          {
            "key": "chemicalDosingRate",
            "label": "Chemical Dosing Rate",
            "unit": "L/h",
            "tag": "",
            "kind": "in",
            "table": false
          }
        ]
      }
    ]
  },
  {
    "key": "uf",
    "label": "UF",
    "section": "uf",
    "groups": [
      {
        "title": "Strainer",
        "fields": [
          {
            "key": "strainerFeedPressure",
            "label": "Strainer Feed Pressure",
            "unit": "kPa",
            "tag": "03PIT01",
            "kind": "in",
            "table": false
          },
          {
            "key": "strainerOutletPressure",
            "label": "Strainer Outlet Pressure",
            "unit": "kPa",
            "tag": "03PIT02",
            "kind": "in",
            "table": false
          },
          {
            "key": "strainerDp",
            "label": "Strainer DP",
            "unit": "kPa",
            "tag": "",
            "kind": "calc",
            "table": true
          },
          {
            "key": "clarifier1OutletTurbidity",
            "label": "Clarifier 1 Outlet Turbidity",
            "unit": "NTU",
            "tag": "02AIT01",
            "kind": "in",
            "table": false
          },
          {
            "key": "clarifier2OutletTurbidity",
            "label": "Clarifier 2 Outlet Turbidity",
            "unit": "NTU",
            "tag": "02AIT02",
            "kind": "in",
            "table": false
          },
          {
            "key": "feedTurbidity",
            "label": "Average UF Feed Turbidity",
            "unit": "NTU",
            "tag": "",
            "kind": "cin",
            "table": true
          },
          {
            "key": "temperature",
            "label": "Temperature",
            "unit": "°C",
            "tag": "10TIT01",
            "kind": "in",
            "table": false
          }
        ]
      },
      {
        "title": "UF 1",
        "fields": [
          {
            "key": "uf1FeedPressure",
            "label": "Feed Pressure",
            "unit": "bar",
            "tag": "05PIT01",
            "kind": "in",
            "table": true
          },
          {
            "key": "uf1FiltratePressure",
            "label": "Filtrate Pressure",
            "unit": "bar",
            "tag": "05PIT02",
            "kind": "in",
            "table": false
          },
          {
            "key": "uf1Dp",
            "label": "UF DP",
            "unit": "bar",
            "tag": "",
            "kind": "calc",
            "table": true
          },
          {
            "key": "uf1FeedFlow",
            "label": "UF Feed Flow",
            "unit": "m³/h",
            "tag": "05FIT01",
            "kind": "in",
            "table": true
          },
          {
            "key": "uf1FiltrateTurbidity",
            "label": "UF Filtrate Turbidity",
            "unit": "NTU",
            "tag": "05AIT02",
            "kind": "in",
            "table": false
          }
        ]
      },
      {
        "title": "UF 2",
        "fields": [
          {
            "key": "uf2FeedPressure",
            "label": "Feed Pressure",
            "unit": "bar",
            "tag": "06PIT01",
            "kind": "in",
            "table": true
          },
          {
            "key": "uf2FiltratePressure",
            "label": "Filtrate Pressure",
            "unit": "bar",
            "tag": "06PIT02",
            "kind": "in",
            "table": false
          },
          {
            "key": "uf2Dp",
            "label": "UF DP",
            "unit": "bar",
            "tag": "",
            "kind": "calc",
            "table": true
          },
          {
            "key": "uf2FeedFlow",
            "label": "UF Feed Flow",
            "unit": "m³/h",
            "tag": "06FIT01",
            "kind": "in",
            "table": true
          },
          {
            "key": "uf2FiltrateTurbidity",
            "label": "UF Filtrate Turbidity",
            "unit": "NTU",
            "tag": "06AIT02",
            "kind": "in",
            "table": false
          }
        ]
      },
      {
        "title": "UF 3",
        "fields": [
          {
            "key": "uf3FeedPressure",
            "label": "Feed Pressure",
            "unit": "bar",
            "tag": "07PIT01",
            "kind": "in",
            "table": true
          },
          {
            "key": "uf3FiltratePressure",
            "label": "Filtrate Pressure",
            "unit": "bar",
            "tag": "07PIT02",
            "kind": "in",
            "table": false
          },
          {
            "key": "uf3Dp",
            "label": "UF DP",
            "unit": "bar",
            "tag": "",
            "kind": "calc",
            "table": true
          },
          {
            "key": "uf3FeedFlow",
            "label": "UF Feed Flow",
            "unit": "m³/h",
            "tag": "07FIT01",
            "kind": "in",
            "table": true
          },
          {
            "key": "uf3FiltrateTurbidity",
            "label": "UF Filtrate Turbidity",
            "unit": "NTU",
            "tag": "07AIT02",
            "kind": "in",
            "table": false
          }
        ]
      },
      {
        "title": "UF 4",
        "fields": [
          {
            "key": "uf4FeedPressure",
            "label": "Feed Pressure",
            "unit": "bar",
            "tag": "08PIT01",
            "kind": "in",
            "table": true
          },
          {
            "key": "uf4FiltratePressure",
            "label": "Filtrate Pressure",
            "unit": "bar",
            "tag": "08PIT02",
            "kind": "in",
            "table": false
          },
          {
            "key": "uf4Dp",
            "label": "UF DP",
            "unit": "bar",
            "tag": "",
            "kind": "calc",
            "table": true
          },
          {
            "key": "uf4FeedFlow",
            "label": "UF Feed Flow",
            "unit": "m³/h",
            "tag": "08FIT01",
            "kind": "in",
            "table": true
          },
          {
            "key": "uf4FiltrateTurbidity",
            "label": "UF Filtrate Turbidity",
            "unit": "NTU",
            "tag": "08AIT02",
            "kind": "in",
            "table": false
          }
        ]
      },
      {
        "title": "UF Feed Pump",
        "fields": [
          {
            "key": "ufPumpTag",
            "label": "Running Pump Tag",
            "unit": "",
            "tag": "",
            "kind": "text",
            "table": false
          },
          {
            "key": "ufPumpSpeed",
            "label": "Speed",
            "unit": "Hz",
            "tag": "",
            "kind": "in",
            "table": false
          },
          {
            "key": "ufPumpCurrent",
            "label": "Current",
            "unit": "A",
            "tag": "",
            "kind": "in",
            "table": false
          }
        ]
      },
      {
        "title": "Overall (existing fields)",
        "fields": [
          {
            "key": "feedFlow",
            "label": "UF Feed Flow (total)",
            "unit": "m³/h",
            "tag": "",
            "kind": "cin",
            "table": false
          },
          {
            "key": "permeateFlow",
            "label": "Permeate Flow",
            "unit": "m³/h",
            "tag": "",
            "kind": "in",
            "table": false
          },
          {
            "key": "backwashFrequency",
            "label": "Backwash Frequency",
            "unit": "min",
            "tag": "",
            "kind": "in",
            "table": false
          },
          {
            "key": "tmp",
            "label": "TMP",
            "unit": "bar",
            "tag": "",
            "kind": "in",
            "table": false
          },
          {
            "key": "sdi",
            "label": "SDI",
            "unit": "",
            "tag": "",
            "kind": "in",
            "table": false
          },
          {
            "key": "feedPressure",
            "label": "Feed Pressure",
            "unit": "bar",
            "tag": "",
            "kind": "in",
            "table": false
          },
          {
            "key": "outletPressure",
            "label": "Outlet Pressure",
            "unit": "bar",
            "tag": "",
            "kind": "in",
            "table": false
          },
          {
            "key": "differentialPressure",
            "label": "Differential Pressure",
            "unit": "bar",
            "tag": "",
            "kind": "calc",
            "table": false
          },
          {
            "key": "filtrateTurbidity",
            "label": "Filtrate Turbidity",
            "unit": "NTU",
            "tag": "",
            "kind": "in",
            "table": false
          }
        ]
      }
    ]
  },
  {
    "key": "swro",
    "label": "SWRO",
    "section": "swro",
    "groups": [
      {
        "title": "Cartridge Filter",
        "fields": [
          {
            "key": "cfFeedPressure",
            "label": "CF Feed Pressure",
            "unit": "bar",
            "tag": "10PIT01",
            "kind": "in",
            "table": false
          },
          {
            "key": "cfOutletPressure",
            "label": "CF Outlet Pressure",
            "unit": "bar",
            "tag": "10PIT02",
            "kind": "in",
            "table": false
          },
          {
            "key": "cfDp",
            "label": "CF DP",
            "unit": "bar",
            "tag": "",
            "kind": "calc",
            "table": false
          }
        ]
      },
      {
        "title": "Pressure",
        "fields": [
          {
            "key": "feedPressure",
            "label": "RO Feed Pressure",
            "unit": "bar",
            "tag": "10PIT03",
            "kind": "in",
            "table": true
          },
          {
            "key": "roBrinePressurePxFeed",
            "label": "RO Brine Pressure (PX Feed)",
            "unit": "bar",
            "tag": "10PIT06",
            "kind": "in",
            "table": false
          },
          {
            "key": "roDp",
            "label": "RO DP",
            "unit": "bar",
            "tag": "",
            "kind": "calc",
            "table": true
          },
          {
            "key": "pxOutletPressureHp",
            "label": "PX Outlet Pressure HP",
            "unit": "bar",
            "tag": "10PIT04",
            "kind": "in",
            "table": false
          },
          {
            "key": "roBrinePressurePxLp",
            "label": "RO Brine Pressure (PX LP)",
            "unit": "bar",
            "tag": "10PIT07",
            "kind": "in",
            "table": false
          },
          {
            "key": "boosterPumpDp",
            "label": "Booster Pump DP",
            "unit": "bar",
            "tag": "",
            "kind": "calc",
            "table": false
          },
          {
            "key": "pxDp",
            "label": "PX DP",
            "unit": "bar",
            "tag": "",
            "kind": "calc",
            "table": false
          },
          {
            "key": "permeatePressure",
            "label": "RO Permeate Pressure",
            "unit": "bar",
            "tag": "10PIT05",
            "kind": "in",
            "table": false
          }
        ]
      },
      {
        "title": "Flow",
        "fields": [
          {
            "key": "roFeedFlowHp",
            "label": "RO Feed Flow : HP",
            "unit": "m³/h",
            "tag": "10FIT01",
            "kind": "in",
            "table": false
          },
          {
            "key": "roFeedFlowLpPx",
            "label": "RO Feed Flow : LP PX",
            "unit": "m³/h",
            "tag": "10FIT02",
            "kind": "in",
            "table": false
          },
          {
            "key": "feedFlow",
            "label": "RO Feed Flow (total)",
            "unit": "m³/h",
            "tag": "",
            "kind": "cin",
            "table": true
          },
          {
            "key": "roBoosterFlow",
            "label": "RO Booster Flow",
            "unit": "m³/h",
            "tag": "10FIT03",
            "kind": "in",
            "table": false
          },
          {
            "key": "brineFlowLp",
            "label": "Brine Flow LP",
            "unit": "m³/h",
            "tag": "10FIT04",
            "kind": "in",
            "table": false
          },
          {
            "key": "brineFlowHp",
            "label": "Brine Flow HP",
            "unit": "m³/h",
            "tag": "",
            "kind": "calc",
            "table": false
          },
          {
            "key": "brineLeakage",
            "label": "Brine Leakage",
            "unit": "m³/h",
            "tag": "",
            "kind": "calc",
            "table": false
          },
          {
            "key": "roPermeateFlow",
            "label": "RO Permeate Flow",
            "unit": "m³/h",
            "tag": "",
            "kind": "calc",
            "table": true
          },
          {
            "key": "recoveryRate",
            "label": "Recovery",
            "unit": "%",
            "tag": "",
            "kind": "cin",
            "table": true
          }
        ]
      },
      {
        "title": "Analysers",
        "fields": [
          {
            "key": "roFeedPh",
            "label": "RO Feed pH",
            "unit": "",
            "tag": "09AIT01",
            "kind": "in",
            "table": false
          },
          {
            "key": "roFeedOrp",
            "label": "RO Feed ORP",
            "unit": "mV",
            "tag": "10AIT01",
            "kind": "in",
            "table": false
          },
          {
            "key": "roFeedTemperature",
            "label": "RO Feed Temperature",
            "unit": "°C",
            "tag": "10TIT01",
            "kind": "in",
            "table": false
          },
          {
            "key": "feedCondPostPxHand",
            "label": "RO Feed Conductivity Post PX (hand)",
            "unit": "mS/cm",
            "tag": "",
            "kind": "in",
            "table": false
          },
          {
            "key": "feedCondRawHand",
            "label": "RO Feed Conductivity Raw (hand)",
            "unit": "mS/cm",
            "tag": "",
            "kind": "in",
            "table": false
          },
          {
            "key": "condIncreasePx",
            "label": "Conductivity Increase Due to PX Leakage",
            "unit": "%",
            "tag": "",
            "kind": "calc",
            "table": false
          },
          {
            "key": "feedCondRaw",
            "label": "RO Feed Conductivity Raw",
            "unit": "mS/cm",
            "tag": "10AIT01",
            "kind": "in",
            "table": false
          },
          {
            "key": "assumedSalinityIncrease",
            "label": "Assumed Salinity Increase from PX",
            "unit": "%",
            "tag": "",
            "kind": "in",
            "table": false
          },
          {
            "key": "feedCondPostPx",
            "label": "RO Feed Conductivity Post PX",
            "unit": "mS/cm",
            "tag": "",
            "kind": "calc",
            "table": false
          },
          {
            "key": "conductivity",
            "label": "RO Permeate Conductivity",
            "unit": "µS/cm",
            "tag": "10AIT02",
            "kind": "in",
            "table": true
          },
          {
            "key": "saltRejection",
            "label": "RO Rejection (raw feed)",
            "unit": "%",
            "tag": "",
            "kind": "cin",
            "table": true
          },
          {
            "key": "saltRejectionPostPx",
            "label": "RO Rejection (post PX salinity increase)",
            "unit": "%",
            "tag": "",
            "kind": "calc",
            "table": false
          }
        ]
      },
      {
        "title": "Dosing",
        "fields": [
          {
            "key": "antiscalantDosing",
            "label": "Antiscalant Dosing Flow",
            "unit": "L/h",
            "tag": "",
            "kind": "in",
            "table": false
          },
          {
            "key": "smbsDosing",
            "label": "SMBS Dosing Flow",
            "unit": "L/h",
            "tag": "",
            "kind": "in",
            "table": false
          }
        ]
      },
      {
        "title": "RO LP Pump",
        "fields": [
          {
            "key": "lpPumpTag",
            "label": "Pump Tag",
            "unit": "",
            "tag": "",
            "kind": "text",
            "table": false
          },
          {
            "key": "lpPumpSpeed",
            "label": "Speed",
            "unit": "Hz",
            "tag": "",
            "kind": "in",
            "table": false
          },
          {
            "key": "lpPumpCasingTemp",
            "label": "Casing Temp",
            "unit": "°C",
            "tag": "",
            "kind": "in",
            "table": false
          },
          {
            "key": "lpPumpDischargePressure",
            "label": "Discharge Pressure",
            "unit": "kPa",
            "tag": "PI gauge",
            "kind": "in",
            "table": false
          },
          {
            "key": "filtrateTankLevelPct",
            "label": "Filtrate Tank Level",
            "unit": "%",
            "tag": "09LIT01",
            "kind": "in",
            "table": false
          },
          {
            "key": "filtrateTankLevelM",
            "label": "Filtrate Tank Level",
            "unit": "m",
            "tag": "",
            "kind": "calc",
            "table": false
          },
          {
            "key": "lpPumpDp",
            "label": "Pump DP",
            "unit": "kPa",
            "tag": "",
            "kind": "calc",
            "table": false
          }
        ]
      },
      {
        "title": "Pressure Profile",
        "fields": [
          {
            "key": "lpPumpDischargeBar",
            "label": "LP Pump Discharge",
            "unit": "bar",
            "tag": "",
            "kind": "calc",
            "table": false
          },
          {
            "key": "dpPumpToCfFeed",
            "label": "DP : Pump to CF Feed",
            "unit": "bar",
            "tag": "",
            "kind": "calc",
            "table": false
          },
          {
            "key": "roHpPumpDp",
            "label": "RO HP Pump DP",
            "unit": "bar",
            "tag": "",
            "kind": "in",
            "table": false
          }
        ]
      },
      {
        "title": "RO HP Pump",
        "fields": [
          {
            "key": "hpPumpTag",
            "label": "Pump Tag",
            "unit": "",
            "tag": "",
            "kind": "text",
            "table": false
          },
          {
            "key": "hpPumpSpeed",
            "label": "Speed",
            "unit": "Hz",
            "tag": "",
            "kind": "in",
            "table": false
          },
          {
            "key": "hpPumpCurrent",
            "label": "Current",
            "unit": "A",
            "tag": "",
            "kind": "in",
            "table": false
          }
        ]
      },
      {
        "title": "RO Booster Pump",
        "fields": [
          {
            "key": "boosterPumpTag",
            "label": "Pump Tag",
            "unit": "",
            "tag": "",
            "kind": "text",
            "table": false
          },
          {
            "key": "boosterPumpSpeed",
            "label": "Speed",
            "unit": "Hz",
            "tag": "",
            "kind": "in",
            "table": false
          },
          {
            "key": "boosterPumpCurrent",
            "label": "Current",
            "unit": "A",
            "tag": "",
            "kind": "in",
            "table": false
          }
        ]
      },
      {
        "title": "Overall (existing fields)",
        "fields": [
          {
            "key": "rejectFlow",
            "label": "Reject Flow",
            "unit": "m³/h",
            "tag": "",
            "kind": "in",
            "table": false
          }
        ]
      }
    ]
  },
  {
    "key": "bwro",
    "label": "BWRO",
    "section": "bwro",
    "groups": [
      {
        "title": "Cartridge Filter",
        "fields": [
          {
            "key": "cfFeedPressure",
            "label": "CF Feed Pressure",
            "unit": "bar",
            "tag": "12PIT01",
            "kind": "in",
            "table": false
          },
          {
            "key": "cfOutletPressure",
            "label": "CF Outlet Pressure",
            "unit": "bar",
            "tag": "12PIT02",
            "kind": "in",
            "table": false
          },
          {
            "key": "cfDp",
            "label": "CF DP",
            "unit": "bar",
            "tag": "",
            "kind": "calc",
            "table": false
          }
        ]
      },
      {
        "title": "Pressure",
        "fields": [
          {
            "key": "feedPressure",
            "label": "RO Feed Pressure",
            "unit": "bar",
            "tag": "12PIT03",
            "kind": "in",
            "table": true
          },
          {
            "key": "interpassPressure",
            "label": "RO Interpass Pressure",
            "unit": "bar",
            "tag": "12PIT04",
            "kind": "in",
            "table": false
          },
          {
            "key": "brinePressure",
            "label": "RO Brine Pressure",
            "unit": "bar",
            "tag": "12PIT06",
            "kind": "in",
            "table": false
          },
          {
            "key": "stage1Dp",
            "label": "RO Stage 1 DP",
            "unit": "bar",
            "tag": "",
            "kind": "cin",
            "table": false
          },
          {
            "key": "stage2Dp",
            "label": "RO Stage 2 DP",
            "unit": "bar",
            "tag": "",
            "kind": "cin",
            "table": false
          },
          {
            "key": "stage1PermeatePressure",
            "label": "RO Stage 1 Permeate Pressure",
            "unit": "bar",
            "tag": "12PI06",
            "kind": "in",
            "table": false
          },
          {
            "key": "permeatePressure",
            "label": "RO Permeate Pressure",
            "unit": "bar",
            "tag": "12PIT05",
            "kind": "in",
            "table": false
          },
          {
            "key": "permeateBackpressure",
            "label": "Permeate Backpressure",
            "unit": "bar",
            "tag": "",
            "kind": "in",
            "table": false
          }
        ]
      },
      {
        "title": "Flow",
        "fields": [
          {
            "key": "feedFlow",
            "label": "RO Feed Flow",
            "unit": "m³/h",
            "tag": "12FIT01",
            "kind": "in",
            "table": true
          },
          {
            "key": "rejectFlow",
            "label": "Brine Flow",
            "unit": "m³/h",
            "tag": "12FIT02",
            "kind": "in",
            "table": false
          },
          {
            "key": "permeateFlow",
            "label": "RO Permeate Flow",
            "unit": "m³/h",
            "tag": "",
            "kind": "cin",
            "table": true
          },
          {
            "key": "recoveryRate",
            "label": "Recovery",
            "unit": "%",
            "tag": "",
            "kind": "cin",
            "table": true
          }
        ]
      },
      {
        "title": "Analysers",
        "fields": [
          {
            "key": "feedTemperature",
            "label": "RO Feed Temperature",
            "unit": "°C",
            "tag": "10TIT01",
            "kind": "in",
            "table": false
          },
          {
            "key": "feedConductivity",
            "label": "RO Feed Conductivity (online)",
            "unit": "µS/cm",
            "tag": "10AIT02",
            "kind": "in",
            "table": false
          },
          {
            "key": "feedConductivityHand",
            "label": "RO Feed Conductivity (hand)",
            "unit": "µS/cm",
            "tag": "",
            "kind": "in",
            "table": false
          },
          {
            "key": "conductivity",
            "label": "RO Permeate Conductivity",
            "unit": "µS/cm",
            "tag": "12AIT02",
            "kind": "in",
            "table": true
          },
          {
            "key": "rejectionOnline",
            "label": "RO Rejection (based on SWRO perm)",
            "unit": "%",
            "tag": "",
            "kind": "calc",
            "table": false
          },
          {
            "key": "rejectionHand",
            "label": "RO Rejection (based on actual, hand)",
            "unit": "%",
            "tag": "",
            "kind": "calc",
            "table": false
          }
        ]
      },
      {
        "title": "Chemical Dosing",
        "fields": [
          {
            "key": "dbnpaDosage",
            "label": "DBNPA Dosage",
            "unit": "L/h",
            "tag": "",
            "kind": "in",
            "table": false
          }
        ]
      },
      {
        "title": "RO LP Pump",
        "fields": [
          {
            "key": "lpPumpTag",
            "label": "Pump Tag",
            "unit": "",
            "tag": "",
            "kind": "text",
            "table": false
          },
          {
            "key": "lpPumpSpeed",
            "label": "Speed",
            "unit": "Hz",
            "tag": "",
            "kind": "in",
            "table": false
          },
          {
            "key": "lpPumpCurrent",
            "label": "Current",
            "unit": "A",
            "tag": "",
            "kind": "in",
            "table": false
          },
          {
            "key": "lpPumpCasingTemp",
            "label": "Casing Temp",
            "unit": "°C",
            "tag": "",
            "kind": "in",
            "table": false
          }
        ]
      },
      {
        "title": "RO HP Pump",
        "fields": [
          {
            "key": "hpPumpTag",
            "label": "Pump Tag",
            "unit": "",
            "tag": "",
            "kind": "text",
            "table": false
          },
          {
            "key": "hpPumpSpeed",
            "label": "Speed",
            "unit": "Hz",
            "tag": "",
            "kind": "in",
            "table": false
          },
          {
            "key": "hpPumpCurrent",
            "label": "Current",
            "unit": "A",
            "tag": "",
            "kind": "in",
            "table": false
          },
          {
            "key": "hpPumpCasingTemp",
            "label": "Casing Temp",
            "unit": "°C",
            "tag": "",
            "kind": "in",
            "table": false
          }
        ]
      }
    ]
  },
  {
    "key": "px",
    "label": "PX Sampling",
    "section": "px",
    "groups": [
      {
        "title": "PX Sampling",
        "fields": [
          {
            "key": "brineConductivity",
            "label": "Brine Conductivity",
            "unit": "µS/cm",
            "tag": "",
            "kind": "in",
            "table": true
          },
          {
            "key": "px01Conductivity",
            "label": "PX 01 Conductivity",
            "unit": "µS/cm",
            "tag": "",
            "kind": "in",
            "table": true
          },
          {
            "key": "px02Conductivity",
            "label": "PX 02 Conductivity",
            "unit": "µS/cm",
            "tag": "",
            "kind": "in",
            "table": true
          },
          {
            "key": "px03Conductivity",
            "label": "PX 03 Conductivity",
            "unit": "µS/cm",
            "tag": "",
            "kind": "in",
            "table": true
          },
          {
            "key": "feedConductivity",
            "label": "Feed Conductivity",
            "unit": "µS/cm",
            "tag": "",
            "kind": "in",
            "table": true
          },
          {
            "key": "temperature",
            "label": "Temperature",
            "unit": "°C",
            "tag": "",
            "kind": "in",
            "table": true
          }
        ]
      }
    ]
  },
  {
    "key": "productWater",
    "label": "Product Water",
    "section": "productwater",
    "groups": [
      {
        "title": "System",
        "fields": [
          {
            "key": "plantFlowCounter",
            "label": "Overall Plant Flow Counter",
            "unit": "m³",
            "tag": "",
            "kind": "in",
            "table": false
          },
          {
            "key": "plantFlowDelta",
            "label": "Overall Plant Flow Delta",
            "unit": "m³",
            "tag": "",
            "kind": "calc",
            "table": true
          },
          {
            "key": "dischargePressure",
            "label": "Discharge Pressure",
            "unit": "bar",
            "tag": "14PIT01",
            "kind": "in",
            "table": true
          },
          {
            "key": "flowRate",
            "label": "Product Discharge Flow",
            "unit": "m³/h",
            "tag": "14FIT01",
            "kind": "in",
            "table": true
          },
          {
            "key": "conductivity",
            "label": "Product Conductivity",
            "unit": "µS/cm",
            "tag": "14AIT01",
            "kind": "in",
            "table": true
          },
          {
            "key": "ph",
            "label": "Product pH",
            "unit": "",
            "tag": "14AIT02",
            "kind": "in",
            "table": true
          }
        ]
      },
      {
        "title": "SWRO Pump",
        "fields": [
          {
            "key": "swroPumpTag",
            "label": "Pump Tag",
            "unit": "",
            "tag": "",
            "kind": "text",
            "table": false
          },
          {
            "key": "swroPumpSpeed",
            "label": "Speed",
            "unit": "Hz",
            "tag": "",
            "kind": "in",
            "table": false
          },
          {
            "key": "swroPumpCurrent",
            "label": "Current",
            "unit": "A",
            "tag": "",
            "kind": "in",
            "table": false
          },
          {
            "key": "swroPumpCasingTemp",
            "label": "Casing Temp",
            "unit": "°C",
            "tag": "",
            "kind": "in",
            "table": false
          }
        ]
      },
      {
        "title": "Product Water Pump",
        "fields": [
          {
            "key": "prodPumpTag",
            "label": "Pump Tag",
            "unit": "",
            "tag": "",
            "kind": "text",
            "table": false
          },
          {
            "key": "prodPumpSpeed",
            "label": "Speed",
            "unit": "Hz",
            "tag": "",
            "kind": "in",
            "table": false
          },
          {
            "key": "prodPumpCurrent",
            "label": "Current",
            "unit": "A",
            "tag": "",
            "kind": "in",
            "table": false
          },
          {
            "key": "prodPumpCasingTemp",
            "label": "Casing Temp",
            "unit": "°C",
            "tag": "",
            "kind": "in",
            "table": false
          },
          {
            "key": "prodPumpActivePower",
            "label": "Active Power",
            "unit": "kW",
            "tag": "",
            "kind": "in",
            "table": false
          },
          {
            "key": "prodPumpActiveEnergy",
            "label": "Active Energy",
            "unit": "kWh",
            "tag": "",
            "kind": "in",
            "table": false
          }
        ]
      },
      {
        "title": "Additional Quality (existing fields)",
        "fields": [
          {
            "key": "tds",
            "label": "TDS",
            "unit": "mg/L",
            "tag": "",
            "kind": "in",
            "table": false
          },
          {
            "key": "chlorineResidual",
            "label": "Chlorine Residual",
            "unit": "mg/L",
            "tag": "",
            "kind": "in",
            "table": false
          },
          {
            "key": "hardness",
            "label": "Hardness",
            "unit": "mg/L",
            "tag": "",
            "kind": "in",
            "table": false
          }
        ]
      }
    ]
  }
] as DesalSectionConfig[];
