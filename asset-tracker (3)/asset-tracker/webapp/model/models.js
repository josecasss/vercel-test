sap.ui.define(["sap/ui/model/json/JSONModel"], function (JSONModel) {
    "use strict";

    /* -----------------------------------------------------------------------
       Status master (ZASSET_STAT_CODE)
       TODO: Replace with OData ValueHelp set read
    ----------------------------------------------------------------------- */
    var oStatusMap = {
        "00": { text: "ASSET OK",             state: "Success", highlight: "Success" },
        "01": { text: "DAMAGE",               state: "Error",   highlight: "Error"   },
        "02": { text: "NOT MATCH COSTCENTER", state: "Warning", highlight: "Warning" },
        "03": { text: "WRITE OFF",            state: "Warning", highlight: "Information" },
        "04": { text: "SOLD",                 state: "None",    highlight: "None"    }
    };

    var aStatusCodes = Object.keys(oStatusMap).map(function (k) {
        return { Key: k, Text: oStatusMap[k].text, State: oStatusMap[k].state };
    });

    function fmt(s) {
        if (!s) { return ""; }
        var p = s.split("-");
        // DD.MM.YYYY
        return p[2] + "." + p[1] + "." + p[0];
    }

    // "Mar 17, 2026" style like Fiori Elements date display
    var _months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    function fmtFiori(s) {
        if (!s) { return ""; }
        var p = s.split("-");
        return _months[parseInt(p[1], 10) - 1] + " " + parseInt(p[2], 10) + ", " + p[0];
    }

    function enrich(o) {
        var st = oStatusMap[o.StatusId] || { text: "UNKNOWN", state: "None", highlight: "None" };
        return {
            Id:                       o.Id,
            MainAssetNumber:          o.MainAssetNumber,
            SubNumber:                o.SubNumber,
            Description:              o.Description,
            InventoryNo:              o.InventoryNo,
            SerialNumber:             o.SerialNumber,
            CostCenter:               o.CostCenter,
            CompanyCode:              o.CompanyCode,
            StatusId:                 o.StatusId,
            StatusText:               st.text,
            StatusState:              st.state,
            StatusHighlight:          st.highlight,
            CreationDate:             o.CreationDate,
            CreationDateFmt:          fmtFiori(o.CreationDate),
            LastCountedDate:          o.LastCountedDate,
            LastCountedDateFmt:       fmtFiori(o.LastCountedDate),
            LastCountedDateFormatted: fmt(o.LastCountedDate),
            UserUpdated:              o.UserUpdated
        };
    }

    /* -----------------------------------------------------------------------
       Mock data — 12 records  (spec: PROTOTYPE_SPEC.md)
       TODO: Replace with OData read → /sap/opu/odata/sap/IM_ASSET_TRACKING_SRV/AssetSet
    ----------------------------------------------------------------------- */
    var aRaw = [
        { Id:"21000004-00", MainAssetNumber:"21000004", SubNumber:"00", Description:"Digital Video Camera SONY",        InventoryNo:"INV-1001", SerialNumber:"SN-SONY-8842A",   CostCenter:"1530200", CompanyCode:"0002", StatusId:"00", CreationDate:"2024-01-15", LastCountedDate:"2025-03-10", UserUpdated:"JKOWALSKI" },
        { Id:"21000008-00", MainAssetNumber:"21000008", SubNumber:"00", Description:"Refrigerator Mitsubishi",           InventoryNo:"INV-1005", SerialNumber:"SN-MITS-0021B",   CostCenter:"1510200", CompanyCode:"0002", StatusId:"01", CreationDate:"2024-02-03", LastCountedDate:"2025-01-22", UserUpdated:"MNOWAK"    },
        { Id:"2300000-00",  MainAssetNumber:"2300000",  SubNumber:"00", Description:"SOFTWARE - PV ELITE",              InventoryNo:"INV-2001", SerialNumber:"SW-PVEL-2022",     CostCenter:"1530200", CompanyCode:"0005", StatusId:"00", CreationDate:"2022-06-01", LastCountedDate:"2025-02-14", UserUpdated:"AWISNIEW"  },
        { Id:"21000023-00", MainAssetNumber:"21000023", SubNumber:"00", Description:"Mobile Phone NOKIA 6610",          InventoryNo:"INV-1023", SerialNumber:"SN-NOK-3310XX",   CostCenter:"1530200", CompanyCode:"0002", StatusId:"02", CreationDate:"2023-04-10", LastCountedDate:"2024-12-05", UserUpdated:"PZAJAC"    },
        { Id:"8000003-00",  MainAssetNumber:"8000003",  SubNumber:"00", Description:"Ris Test Device",                  InventoryNo:"INV-8003", SerialNumber:"SN-RIS-00301",     CostCenter:"1530100", CompanyCode:"0002", StatusId:"03", CreationDate:"2021-09-20", LastCountedDate:"2024-11-30", UserUpdated:"JKOWALSKI" },
        { Id:"21000015-00", MainAssetNumber:"21000015", SubNumber:"00", Description:"Laptop Dell Latitude 5520",        InventoryNo:"INV-1015", SerialNumber:"SN-DELL-L5520-7", CostCenter:"1520100", CompanyCode:"0005", StatusId:"00", CreationDate:"2023-11-01", LastCountedDate:"2025-03-01", UserUpdated:"KTOMASZ"   },
        { Id:"21000016-00", MainAssetNumber:"21000016", SubNumber:"00", Description:"Projector Epson EB-X41",           InventoryNo:"INV-1016", SerialNumber:"SN-EPS-EBX41-3",  CostCenter:"1530200", CompanyCode:"0002", StatusId:"01", CreationDate:"2023-05-18", LastCountedDate:"2025-02-20", UserUpdated:"MNOWAK"    },
        { Id:"21000019-00", MainAssetNumber:"21000019", SubNumber:"00", Description:"UPS APC Smart-UPS 1500",           InventoryNo:"INV-1019", SerialNumber:"SN-APC-SU1500-1", CostCenter:"1510200", CompanyCode:"0005", StatusId:"00", CreationDate:"2022-08-14", LastCountedDate:"2025-01-15", UserUpdated:"AWISNIEW"  },
        { Id:"21000025-00", MainAssetNumber:"21000025", SubNumber:"00", Description:"Printer HP LaserJet M428",         InventoryNo:"INV-1025", SerialNumber:"SN-HP-M428-99",   CostCenter:"1520100", CompanyCode:"0002", StatusId:"04", CreationDate:"2021-03-22", LastCountedDate:"2024-09-10", UserUpdated:"PZAJAC"    },
        { Id:"21000031-00", MainAssetNumber:"21000031", SubNumber:"00", Description:"Network Switch Cisco SG110",       InventoryNo:"INV-1031", SerialNumber:"SN-CISCO-SG110-5",CostCenter:"1510200", CompanyCode:"0005", StatusId:"02", CreationDate:"2022-12-01", LastCountedDate:"2024-10-25", UserUpdated:"KTOMASZ"   },
        { Id:"21000042-00", MainAssetNumber:"21000042", SubNumber:"00", Description:"Oscilloscope Tektronix TDS2024",   InventoryNo:"INV-1042", SerialNumber:"SN-TEK-TDS2024-2",CostCenter:"1530100", CompanyCode:"0002", StatusId:"00", CreationDate:"2023-07-30", LastCountedDate:"2025-02-28", UserUpdated:"JKOWALSKI" },
        { Id:"21000055-00", MainAssetNumber:"21000055", SubNumber:"00", Description:"Air Compressor Atlas Copco GA11",  InventoryNo:"INV-1055", SerialNumber:"SN-AC-GA11-008",  CostCenter:"1540300", CompanyCode:"0005", StatusId:"03", CreationDate:"2021-11-05", LastCountedDate:"2024-08-18", UserUpdated:"MNOWAK"    }
    ];

    var aEnriched = aRaw.map(enrich);

    return {
        createDataModel: function () {
            return new JSONModel({
                Assets:        JSON.parse(JSON.stringify(aEnriched)),
                displayAssets: JSON.parse(JSON.stringify(aEnriched)),
                StatusCodes:   aStatusCodes,
                selectedAsset: null,
                hasSelectedAsset: false,
                tableTitle:    "Assets (" + aEnriched.length + ")",
                filters: {
                    search: "", editingStatus: "ALL", assetTag: "",
                    companyCode: "", assetNo: "", subNumber: "",
                    statusCode: "", creationDateFrom: "", creationDateTo: ""
                }
            });
        },
        getStatusMap: function () { return oStatusMap; },
        enrich: enrich,
        fmt: fmt,
        fmtFiori: fmtFiori
    };
});
