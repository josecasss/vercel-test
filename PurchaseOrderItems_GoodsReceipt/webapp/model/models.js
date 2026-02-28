sap.ui.define([
    "sap/ui/model/json/JSONModel"
], function (JSONModel) {
    "use strict";

    function formatDate(sDate) {
        if (!sDate) return "";
        var aParts = sDate.split("-");
        return aParts[2] + "." + aParts[1] + "." + aParts[0]; // DD.MM.YYYY
    }

    return {
        createDataModel: function () {
            var aRawItems = [
                { Id: "PO-12345678-3000004", Plant: "001", PlantDesc: "Main Plant",    Supplier: "ACME LLC",    PurchaseOrder: "12345678", Delivery: "3000004", MaterialDescription: "Steel Beam HEB 200",    Date: "2025-04-12", HasError: false },
                { Id: "PO-12345679-3000005", Plant: "002", PlantDesc: "Secondary Plant", Supplier: "ACME LLC",    PurchaseOrder: "12345679", Delivery: "3000005", MaterialDescription: "Aluminum Sheet 2mm",    Date: "2025-04-12", HasError: false },
                { Id: "PO-12345677-3000006", Plant: "001", PlantDesc: "Main Plant",    Supplier: "COMPANY SRL", PurchaseOrder: "12345677", Delivery: "3000006", MaterialDescription: "Industrial Valve DN50",  Date: "2025-04-12", HasError: true  },
                { Id: "PO-12345680-3000007", Plant: "001", PlantDesc: "Main Plant",    Supplier: "ACME LLC",    PurchaseOrder: "12345680", Delivery: "3000007", MaterialDescription: "Copper Wire 4mm",       Date: "2025-04-15", HasError: false },
                { Id: "PO-12345681-3000008", Plant: "002", PlantDesc: "Secondary Plant", Supplier: "COMPANY SRL", PurchaseOrder: "12345681", Delivery: "3000008", MaterialDescription: "Hydraulic Pump HP200",  Date: "2025-04-18", HasError: true  },
                { Id: "PO-12345682-3000009", Plant: "001", PlantDesc: "Main Plant",    Supplier: "COMPANY SRL", PurchaseOrder: "12345682", Delivery: "3000009", MaterialDescription: "Bearing SKF 6205",      Date: "2025-04-20", HasError: false },
                { Id: "PO-12345683-3000010", Plant: "002", PlantDesc: "Secondary Plant", Supplier: "ACME LLC",    PurchaseOrder: "12345683", Delivery: "3000010", MaterialDescription: "Electric Motor 5kW",    Date: "2025-04-22", HasError: false },
                { Id: "PO-12345684-3000011", Plant: "001", PlantDesc: "Main Plant",    Supplier: "ACME LLC",    PurchaseOrder: "12345684", Delivery: "3000011", MaterialDescription: "PVC Pipe DN100",        Date: "2025-04-25", HasError: true  }
            ];

            // Pre-format dates
            aRawItems.forEach(function (oItem) {
                oItem.DateFormatted = formatDate(oItem.Date);
            });

            return new JSONModel({
                // Master data (all records)
                PurchaseOrderItems: aRawItems,

                // Display data (table starts empty)
                displayItems: [],

                // Filter values
                filters: {
                    Plant: "",
                    PlantDisplay: "",
                    Supplier: "",
                    SupplierDisplay: "",
                    PurchaseOrder: "",
                    OnlyWithoutErrors: false
                },

                // Value help data
                Plants: [
                    { Key: "001", Text: "Main Plant" },
                    { Key: "002", Text: "Secondary Plant" }
                ],
                Suppliers: [
                    { Key: "1234", Text: "ACME LLC" },
                    { Key: "5678", Text: "COMPANY SRL" }
                ],

                // Table row count
                tableTitle: "Purchase Order Items (0)",

                // Selected item for detail page
                selectedItem: null,

                // Dialog state
                createGRDate: new Date()
            });
        }
    };
});
