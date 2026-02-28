sap.ui.define([
    "sap/ui/model/json/JSONModel"
], function (JSONModel) {
    "use strict";

    return {
        createDataModel: function () {

            var aRawItems = [
                {
                    Id: "CLM-9001",
                    ClaimID: "CLM-9001",
                    CustomerCode: "C700",
                    CustomerName: "TechCorp",
                    SalesOrg: "1010",
                    SalesOrgDesc: "Domestic Sales",
                    ReferenceInvoice: "INV-45001",
                    ClaimCategory: "Damaged Goods",
                    DateFormatted: "10.02.2026",
                    Priority: "01",
                    PriorityText: "High",
                    HasError: false
                },
                {
                    Id: "CLM-9002",
                    ClaimID: "CLM-9002",
                    CustomerCode: "C800",
                    CustomerName: "Global Logistics",
                    SalesOrg: "1020",
                    SalesOrgDesc: "International",
                    ReferenceInvoice: "INV-45002",
                    ClaimCategory: "Wrong Quantity",
                    DateFormatted: "12.02.2026",
                    Priority: "02",
                    PriorityText: "Medium",
                    HasError: false
                },
                {
                    Id: "CLM-9003",
                    ClaimID: "CLM-9003",
                    CustomerCode: "C700",
                    CustomerName: "TechCorp",
                    SalesOrg: "1010",
                    SalesOrgDesc: "Domestic Sales",
                    ReferenceInvoice: "INV-45003",
                    ClaimCategory: "Late Delivery",
                    DateFormatted: "15.02.2026",
                    Priority: "03",
                    PriorityText: "Low",
                    HasError: true
                },
                {
                    Id: "CLM-9004",
                    ClaimID: "CLM-9004",
                    CustomerCode: "C700",
                    CustomerName: "TechCorp",
                    SalesOrg: "1010",
                    SalesOrgDesc: "Domestic Sales",
                    ReferenceInvoice: "INV-45004",
                    ClaimCategory: "Damaged Goods",
                    DateFormatted: "18.02.2026",
                    Priority: "01",
                    PriorityText: "High",
                    HasError: false
                },
                {
                    Id: "CLM-9005",
                    ClaimID: "CLM-9005",
                    CustomerCode: "C800",
                    CustomerName: "Global Logistics",
                    SalesOrg: "1020",
                    SalesOrgDesc: "International",
                    ReferenceInvoice: "INV-45005",
                    ClaimCategory: "Pricing Error",
                    DateFormatted: "20.02.2026",
                    Priority: "02",
                    PriorityText: "Medium",
                    HasError: true
                },
                {
                    Id: "CLM-9006",
                    ClaimID: "CLM-9006",
                    CustomerCode: "C800",
                    CustomerName: "Global Logistics",
                    SalesOrg: "1020",
                    SalesOrgDesc: "International",
                    ReferenceInvoice: "INV-45006",
                    ClaimCategory: "Wrong Material",
                    DateFormatted: "22.02.2026",
                    Priority: "01",
                    PriorityText: "High",
                    HasError: false
                },
                {
                    Id: "CLM-9007",
                    ClaimID: "CLM-9007",
                    CustomerCode: "C700",
                    CustomerName: "TechCorp",
                    SalesOrg: "1010",
                    SalesOrgDesc: "Domestic Sales",
                    ReferenceInvoice: "INV-45007",
                    ClaimCategory: "Damaged Goods",
                    DateFormatted: "25.02.2026",
                    Priority: "02",
                    PriorityText: "Medium",
                    HasError: false
                },
                {
                    Id: "CLM-9008",
                    ClaimID: "CLM-9008",
                    CustomerCode: "C800",
                    CustomerName: "Global Logistics",
                    SalesOrg: "1020",
                    SalesOrgDesc: "International",
                    ReferenceInvoice: "INV-45008",
                    ClaimCategory: "Missing Parts",
                    DateFormatted: "28.02.2026",
                    Priority: "01",
                    PriorityText: "High",
                    HasError: true
                }
            ];

            return new JSONModel({
                // Master data – all records
                CustomerClaims: aRawItems,

                // Display data – table starts EMPTY
                displayItems: [],

                // Filter state
                filters: {
                    SalesOrg: "",
                    SalesOrgDisplay: "",
                    Customer: "",
                    CustomerDisplay: "",
                    ClaimID: "",
                    HighPriorityOnly: false
                },

                // Value help data
                SalesOrganizations: [
                    { Key: "1010", Text: "Domestic Sales" },
                    { Key: "1020", Text: "International" }
                ],
                Customers: [
                    { Key: "C700", Text: "TechCorp" },
                    { Key: "C800", Text: "Global Logistics" }
                ],

                // Table title counter
                tableTitle: "Customer Claims (0)",

                // Selection state
                hasSelection: false,

                // Currently viewed item (Object Page)
                selectedItem: null,

                // Dialog state
                processClaimDate: new Date()
            });
        }
    };
});
