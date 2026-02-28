sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageToast",
    "sap/ui/core/Fragment"
], function (Controller, Filter, FilterOperator, MessageToast, Fragment) {
    "use strict";

    return Controller.extend("com.prototype.goodsreceipt.controller.List", {

        onInit: function () {
            this.getOwnerComponent().getRouter()
                .getRoute("list")
                .attachPatternMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: function () {
            var oModel = this.getView().getModel();
            if (oModel) {
                oModel.setProperty("/hasSelection", false);
            }
        },

        // ─── Filter / Search ─────────────────────────────────────────────

        onSearch: function () {
            var oModel = this.getView().getModel();
            var oFilters = oModel.getProperty("/filters");
            var aAllItems = oModel.getProperty("/PurchaseOrderItems");

            var aFiltered = aAllItems.filter(function (oItem) {
                var bPlant = !oFilters.Plant || oItem.Plant === oFilters.Plant;
                var bSupplier = !oFilters.Supplier || oItem.Supplier === oFilters.SupplierDisplay;
                var bPO = !oFilters.PurchaseOrder || oItem.PurchaseOrder.indexOf(oFilters.PurchaseOrder) !== -1;
                var bErrors = !oFilters.OnlyWithoutErrors || oItem.HasError === false;
                return bPlant && bSupplier && bPO && bErrors;
            });

            oModel.setProperty("/displayItems", aFiltered);
            oModel.setProperty("/tableTitle", "Purchase Order Items (" + aFiltered.length + ")");
            oModel.setProperty("/hasSelection", false);

            // Reset table selection
            var oTable = this.byId("poItemsTable");
            if (oTable) {
                oTable.removeSelections(true);
            }
        },

        // ─── Selection ───────────────────────────────────────────────────

        onSelectionChange: function () {
            var oTable = this.byId("poItemsTable");
            var aSelected = oTable.getSelectedItems();
            this.getView().getModel().setProperty("/hasSelection", aSelected.length > 0);
        },

        // ─── Navigation ──────────────────────────────────────────────────

        onItemPress: function (oEvent) {
            var oItem = oEvent.getSource().getBindingContext().getObject();
            this.getOwnerComponent().getRouter().navTo("detail", {
                objectId: encodeURIComponent(oItem.Id)
            });
        },

        // ─── Create GR Action ────────────────────────────────────────────

        onCreateGR: function () {
            this._openCreateGRDialog();
        },

        _openCreateGRDialog: function () {
            var oView = this.getView();
            if (!this._oCreateGRDialog) {
                Fragment.load({
                    id: oView.getId(),
                    name: "com.prototype.goodsreceipt.fragment.CreateGRDialog",
                    controller: this
                }).then(function (oDialog) {
                    this._oCreateGRDialog = oDialog;
                    oView.addDependent(oDialog);
                    // Set today's date
                    var oModel = oView.getModel();
                    oModel.setProperty("/createGRDate", new Date());
                    oDialog.open();
                }.bind(this));
            } else {
                this.getView().getModel().setProperty("/createGRDate", new Date());
                this._oCreateGRDialog.open();
            }
        },

        onCreateGRConfirm: function () {
            // Generate a random GR number for the toast
            var sGRNumber = "GR" + Math.floor(Math.random() * 9000000 + 1000000);
            this._oCreateGRDialog.close();
            MessageToast.show("Goods Receipt " + sGRNumber + " created");

            // Clear selection after creation
            var oTable = this.byId("poItemsTable");
            if (oTable) {
                oTable.removeSelections(true);
            }
            this.getView().getModel().setProperty("/hasSelection", false);
        },

        onCreateGRCancel: function () {
            this._oCreateGRDialog.close();
        },

        // ─── Plant Value Help ─────────────────────────────────────────────

        onPlantValueHelp: function () {
            var oView = this.getView();
            if (!this._oPlantDialog) {
                Fragment.load({
                    id: oView.getId(),
                    name: "com.prototype.goodsreceipt.fragment.PlantValueHelp",
                    controller: this
                }).then(function (oDialog) {
                    this._oPlantDialog = oDialog;
                    oView.addDependent(oDialog);
                    oDialog.open();
                }.bind(this));
            } else {
                this._oPlantDialog.open();
            }
        },

        onPlantValueHelpSearch: function (oEvent) {
            var sValue = oEvent.getParameter("value");
            var oFilter = new Filter({
                filters: [
                    new Filter("Key", FilterOperator.Contains, sValue),
                    new Filter("Text", FilterOperator.Contains, sValue)
                ],
                and: false
            });
            oEvent.getSource().getBinding("items").filter([oFilter]);
        },

        onPlantValueHelpConfirm: function (oEvent) {
            var oSelectedItem = oEvent.getParameter("selectedItem");
            var oModel = this.getView().getModel();
            if (oSelectedItem) {
                oModel.setProperty("/filters/Plant", oSelectedItem.getTitle());
                oModel.setProperty("/filters/PlantDisplay", oSelectedItem.getTitle() + " - " + oSelectedItem.getDescription());
            } else {
                oModel.setProperty("/filters/Plant", "");
                oModel.setProperty("/filters/PlantDisplay", "");
            }
        },

        onPlantValueHelpCancel: function () {
            // Dialog closed without selection - no action needed
        },

        // ─── Supplier Value Help ──────────────────────────────────────────

        onSupplierValueHelp: function () {
            var oView = this.getView();
            if (!this._oSupplierDialog) {
                Fragment.load({
                    id: oView.getId(),
                    name: "com.prototype.goodsreceipt.fragment.SupplierValueHelp",
                    controller: this
                }).then(function (oDialog) {
                    this._oSupplierDialog = oDialog;
                    oView.addDependent(oDialog);
                    oDialog.open();
                }.bind(this));
            } else {
                this._oSupplierDialog.open();
            }
        },

        onSupplierValueHelpSearch: function (oEvent) {
            var sValue = oEvent.getParameter("value");
            var oFilter = new Filter({
                filters: [
                    new Filter("Key", FilterOperator.Contains, sValue),
                    new Filter("Text", FilterOperator.Contains, sValue)
                ],
                and: false
            });
            oEvent.getSource().getBinding("items").filter([oFilter]);
        },

        onSupplierValueHelpConfirm: function (oEvent) {
            var oSelectedItem = oEvent.getParameter("selectedItem");
            var oModel = this.getView().getModel();
            if (oSelectedItem) {
                oModel.setProperty("/filters/Supplier", oSelectedItem.getDescription());
                oModel.setProperty("/filters/SupplierDisplay", oSelectedItem.getTitle() + " - " + oSelectedItem.getDescription());
            } else {
                oModel.setProperty("/filters/Supplier", "");
                oModel.setProperty("/filters/SupplierDisplay", "");
            }
        },

        onSupplierValueHelpCancel: function () {
            // Dialog closed without selection - no action needed
        }

    });
});
