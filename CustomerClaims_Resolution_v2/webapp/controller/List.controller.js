sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageToast",
    "sap/ui/core/Fragment"
], function (Controller, Filter, FilterOperator, MessageToast, Fragment) {
    "use strict";

    return Controller.extend("com.prototype.claims.controller.List", {

        // ─── Lifecycle ────────────────────────────────────────────────────

        onInit: function () {
            this.getOwnerComponent().getRouter()
                .getRoute("list")
                .attachPatternMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: function () {
            var oModel = this.getView().getModel();
            if (!oModel) { return; }
            // Reset selection state when returning from detail
            oModel.setProperty("/hasSelection", false);
            var oTable = this.byId("claimsTable");
            if (oTable) {
                oTable.removeSelections(true);
            }
        },

        // ─── Filter / Search ──────────────────────────────────────────────

        onSearch: function () {
            var oModel   = this.getView().getModel();
            var oFilters = oModel.getProperty("/filters");
            var aAll     = oModel.getProperty("/CustomerClaims");

            var aFiltered = aAll.filter(function (oItem) {
                // Sales Org
                var bSalesOrg = !oFilters.SalesOrg ||
                    oItem.SalesOrg === oFilters.SalesOrg;

                // Customer (stored display value matches CustomerName)
                var bCustomer = !oFilters.Customer ||
                    oItem.CustomerName === oFilters.Customer;

                // Claim ID (contains, case-insensitive)
                var bClaimID = !oFilters.ClaimID ||
                    oItem.ClaimID.toLowerCase().indexOf(oFilters.ClaimID.toLowerCase()) !== -1;

                // High Priority Only – Priority === '01'
                var bPriority = !oFilters.HighPriorityOnly || oItem.Priority === "01";

                return bSalesOrg && bCustomer && bClaimID && bPriority;
            });

            oModel.setProperty("/displayItems", aFiltered);
            oModel.setProperty("/tableTitle", "Customer Claims (" + aFiltered.length + ")");

            // Reset table selection
            oModel.setProperty("/hasSelection", false);
            var oTable = this.byId("claimsTable");
            if (oTable) { oTable.removeSelections(true); }
        },

        // ─── Table Selection ──────────────────────────────────────────────

        onSelectionChange: function () {
            var oTable    = this.byId("claimsTable");
            var aSelected = oTable ? oTable.getSelectedItems() : [];
            this.getView().getModel().setProperty("/hasSelection", aSelected.length > 0);
        },

        // ─── Row Navigation ───────────────────────────────────────────────

        onItemPress: function (oEvent) {
            var oItem = oEvent.getSource().getBindingContext().getObject();
            this.getOwnerComponent().getRouter().navTo("detail", {
                objectId: encodeURIComponent(oItem.Id)
            });
        },

        // ─── Process Claim Dialog ─────────────────────────────────────────

        onProcessClaim: function () {
            var oView = this.getView();
            // Reset date to today on every open
            oView.getModel().setProperty("/processClaimDate", new Date());

            if (!this._oProcessDialog) {
                Fragment.load({
                    id: oView.getId(),
                    name: "com.prototype.claims.fragment.ProcessClaimDialog",
                    controller: this
                }).then(function (oDialog) {
                    this._oProcessDialog = oDialog;
                    oView.addDependent(oDialog);
                    oDialog.open();
                }.bind(this));
            } else {
                this._oProcessDialog.open();
            }
        },

        onProcessClaimConfirm: function () {
            var sRefNumber = "RES" + Math.floor(Math.random() * 900000 + 100000);
            this._oProcessDialog.close();
            MessageToast.show("Claim Resolution " + sRefNumber + " processed");

            // Clear selection
            var oTable = this.byId("claimsTable");
            if (oTable) { oTable.removeSelections(true); }
            this.getView().getModel().setProperty("/hasSelection", false);
        },

        onProcessClaimCancel: function () {
            this._oProcessDialog.close();
        },

        // ─── Sales Organization Value Help ────────────────────────────────

        onSalesOrgValueHelp: function () {
            var oView = this.getView();
            if (!this._oSalesOrgDialog) {
                Fragment.load({
                    id: oView.getId(),
                    name: "com.prototype.claims.fragment.SalesOrgValueHelp",
                    controller: this
                }).then(function (oDialog) {
                    this._oSalesOrgDialog = oDialog;
                    oView.addDependent(oDialog);
                    oDialog.open();
                }.bind(this));
            } else {
                this._oSalesOrgDialog.open();
            }
        },

        onSalesOrgSearch: function (oEvent) {
            var sValue = oEvent.getParameter("value");
            var oFilter = new Filter({
                filters: [
                    new Filter("Key",  FilterOperator.Contains, sValue),
                    new Filter("Text", FilterOperator.Contains, sValue)
                ],
                and: false
            });
            oEvent.getSource().getBinding("items").filter([oFilter]);
        },

        onSalesOrgConfirm: function (oEvent) {
            var oSel   = oEvent.getParameter("selectedItem");
            var oModel = this.getView().getModel();
            if (oSel) {
                oModel.setProperty("/filters/SalesOrg", oSel.getTitle());
                oModel.setProperty("/filters/SalesOrgDisplay", oSel.getTitle() + " – " + oSel.getDescription());
            } else {
                oModel.setProperty("/filters/SalesOrg", "");
                oModel.setProperty("/filters/SalesOrgDisplay", "");
            }
        },

        onSalesOrgCancel: function () { /* no-op */ },

        // ─── Customer Value Help ──────────────────────────────────────────

        onCustomerValueHelp: function () {
            var oView = this.getView();
            if (!this._oCustomerDialog) {
                Fragment.load({
                    id: oView.getId(),
                    name: "com.prototype.claims.fragment.CustomerValueHelp",
                    controller: this
                }).then(function (oDialog) {
                    this._oCustomerDialog = oDialog;
                    oView.addDependent(oDialog);
                    oDialog.open();
                }.bind(this));
            } else {
                this._oCustomerDialog.open();
            }
        },

        onCustomerSearch: function (oEvent) {
            var sValue = oEvent.getParameter("value");
            var oFilter = new Filter({
                filters: [
                    new Filter("Key",  FilterOperator.Contains, sValue),
                    new Filter("Text", FilterOperator.Contains, sValue)
                ],
                and: false
            });
            oEvent.getSource().getBinding("items").filter([oFilter]);
        },

        onCustomerConfirm: function (oEvent) {
            var oSel   = oEvent.getParameter("selectedItem");
            var oModel = this.getView().getModel();
            if (oSel) {
                // Store CustomerName for filter comparison
                oModel.setProperty("/filters/Customer", oSel.getDescription());
                oModel.setProperty("/filters/CustomerDisplay", oSel.getTitle() + " – " + oSel.getDescription());
            } else {
                oModel.setProperty("/filters/Customer", "");
                oModel.setProperty("/filters/CustomerDisplay", "");
            }
        },

        onCustomerCancel: function () { /* no-op */ }

    });
});
