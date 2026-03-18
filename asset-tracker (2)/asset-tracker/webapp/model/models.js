sap.ui.define(["sap/ui/model/json/JSONModel"], function (JSONModel) {
    "use strict";

    // -----------------------------------------------------------------------
    // Status config (mirrors ZASSET_STAT_CODE Z-table)
    // -----------------------------------------------------------------------
    var oStatusMap = {
        "0": { text: "ASSET OK",             state: "Success",     btnType: "Accept"    },
        "1": { text: "DAMAGE",               state: "Error",       btnType: "Reject"    },
        "2": { text: "NOT MATCH COSTCENTER", state: "Warning",     btnType: "Attention" },
        "3": { text: "WRITE OFF",            state: "Warning",     btnType: "Attention" },
        "4": { text: "SOLD",                 state: "None",        btnType: "Default"   }
    };

    var aStatusCodes = Object.keys(oStatusMap).map(function (k) {
        return { Key: k, Text: oStatusMap[k].text, BtnType: oStatusMap[k].btnType, State: oStatusMap[k].state };
    });

    // -----------------------------------------------------------------------
    // Helpers
    // -----------------------------------------------------------------------
    function fmt(s) {
        if (!s) { return ""; }
        var p = s.split("-");
        return p[2] + "." + p[1] + "." + p[0];
    }

    function enrich(o) {
        var st = oStatusMap[o.StatusId] || { text: "UNKNOWN", state: "None", btnType: "Default" };
        return {
            Id: o.Id, MainAssetNumber: o.MainAssetNumber, SubNumber: o.SubNumber,
            Description: o.Description, InventoryNo: o.InventoryNo, SerialNumber: o.SerialNumber,
            CostCenter: o.CostCenter, CompanyCode: o.CompanyCode,
            StatusId: o.StatusId, StatusText: st.text, StatusState: st.state,
            LastCountedDate: o.LastCountedDate, LastCountedDateFormatted: fmt(o.LastCountedDate),
            UserUpdated: o.UserUpdated
        };
    }

    // -----------------------------------------------------------------------
    // Mock data — 12 records (PROTOTYPE_SPEC)
    // TODO: Replace with OData read → /sap/opu/odata/sap/IM_ASSET_TRACKING_SRV/AssetSet
    // -----------------------------------------------------------------------
    var aRaw = [
        { Id:"21000004-00", MainAssetNumber:"21000004", SubNumber:"00", Description:"Digital Video Camera SONY",      InventoryNo:"INV-1001", SerialNumber:"SN-SONY-8842A",   CostCenter:"1530200", CompanyCode:"1000", StatusId:"0", LastCountedDate:"2025-03-10", UserUpdated:"JKOWALSKI" },
        { Id:"21000008-00", MainAssetNumber:"21000008", SubNumber:"00", Description:"Refrigerator Mitsubishi",         InventoryNo:"INV-1005", SerialNumber:"SN-MITS-0021B",   CostCenter:"1510200", CompanyCode:"1000", StatusId:"1", LastCountedDate:"2025-01-22", UserUpdated:"MNOWAK"   },
        { Id:"2300000-00",  MainAssetNumber:"2300000",  SubNumber:"00", Description:"SOFTWARE - PV ELITE",            InventoryNo:"INV-2001", SerialNumber:"SW-PVEL-2022",     CostCenter:"1530200", CompanyCode:"1000", StatusId:"0", LastCountedDate:"2025-02-14", UserUpdated:"AWISNIEW" },
        { Id:"21000023-00", MainAssetNumber:"21000023", SubNumber:"00", Description:"Mobile Phone NOKIA 6610",        InventoryNo:"INV-1023", SerialNumber:"SN-NOK-3310XX",   CostCenter:"1530200", CompanyCode:"1000", StatusId:"2", LastCountedDate:"2024-12-05", UserUpdated:"PZAJAC"   },
        { Id:"8000003-00",  MainAssetNumber:"8000003",  SubNumber:"00", Description:"Ris Test Device",                InventoryNo:"INV-8003", SerialNumber:"SN-RIS-00301",     CostCenter:"1530100", CompanyCode:"1000", StatusId:"3", LastCountedDate:"2024-11-30", UserUpdated:"JKOWALSKI"},
        { Id:"21000015-00", MainAssetNumber:"21000015", SubNumber:"00", Description:"Laptop Dell Latitude 5520",      InventoryNo:"INV-1015", SerialNumber:"SN-DELL-L5520-7", CostCenter:"1520100", CompanyCode:"1000", StatusId:"0", LastCountedDate:"2025-03-01", UserUpdated:"KTOMASZ"  },
        { Id:"21000016-00", MainAssetNumber:"21000016", SubNumber:"00", Description:"Projector Epson EB-X41",         InventoryNo:"INV-1016", SerialNumber:"SN-EPS-EBX41-3",  CostCenter:"1530200", CompanyCode:"1000", StatusId:"1", LastCountedDate:"2025-02-20", UserUpdated:"MNOWAK"   },
        { Id:"21000019-00", MainAssetNumber:"21000019", SubNumber:"00", Description:"UPS APC Smart-UPS 1500",         InventoryNo:"INV-1019", SerialNumber:"SN-APC-SU1500-1", CostCenter:"1510200", CompanyCode:"1000", StatusId:"0", LastCountedDate:"2025-01-15", UserUpdated:"AWISNIEW" },
        { Id:"21000025-00", MainAssetNumber:"21000025", SubNumber:"00", Description:"Printer HP LaserJet M428",       InventoryNo:"INV-1025", SerialNumber:"SN-HP-M428-99",   CostCenter:"1520100", CompanyCode:"1000", StatusId:"4", LastCountedDate:"2024-09-10", UserUpdated:"PZAJAC"   },
        { Id:"21000031-00", MainAssetNumber:"21000031", SubNumber:"00", Description:"Network Switch Cisco SG110",     InventoryNo:"INV-1031", SerialNumber:"SN-CISCO-SG110-5",CostCenter:"1510200", CompanyCode:"1000", StatusId:"2", LastCountedDate:"2024-10-25", UserUpdated:"KTOMASZ"  },
        { Id:"21000042-00", MainAssetNumber:"21000042", SubNumber:"00", Description:"Oscilloscope Tektronix TDS2024", InventoryNo:"INV-1042", SerialNumber:"SN-TEK-TDS2024-2",CostCenter:"1530100", CompanyCode:"1000", StatusId:"0", LastCountedDate:"2025-02-28", UserUpdated:"JKOWALSKI"},
        { Id:"21000055-00", MainAssetNumber:"21000055", SubNumber:"00", Description:"Air Compressor Atlas Copco GA11",InventoryNo:"INV-1055", SerialNumber:"SN-AC-GA11-008",  CostCenter:"1540300", CompanyCode:"1000", StatusId:"3", LastCountedDate:"2024-08-18", UserUpdated:"MNOWAK"   }
    ];

    var aEnriched = aRaw.map(enrich);

    // -----------------------------------------------------------------------
    // Public API
    // -----------------------------------------------------------------------
    return {
        createDataModel: function () {
            return new JSONModel({
                Assets:        JSON.parse(JSON.stringify(aEnriched)),
                displayAssets: JSON.parse(JSON.stringify(aEnriched)),
                StatusCodes:   aStatusCodes,
                selectedAsset: null,
                hasSelectedAsset: false,
                pendingAsset:  null   // asset currently being status-updated
            });
        },
        getStatusMap: function () { return oStatusMap; },
        enrich: enrich,
        fmt: fmt
    };
});
