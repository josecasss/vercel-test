sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/m/ViewSettingsDialog",
    "sap/m/ViewSettingsItem",
    "sap/m/Dialog",
    "sap/m/Button",
    "sap/m/Input",
    "sap/m/VBox",
    "sap/m/Label",
    "sap/m/ButtonType"
], function (
    Controller, MessageToast,
    ViewSettingsDialog, ViewSettingsItem,
    Dialog, Button, Input, VBox, Label
) {
    "use strict";

    return Controller.extend("com.aibel.assettracking.controller.List", {

        // ===================================================================
        // Lifecycle
        // ===================================================================

        onInit: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            // Keep list in sync for both routes (SplitApp shows master for both)
            oRouter.getRoute("list").attachPatternMatched(this._onRouteMatched, this);
            oRouter.getRoute("detail").attachPatternMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: function () {
            // Intentionally empty — hook for future OData refresh
        },

        // ===================================================================
        // Search / Filter
        // ===================================================================

        /**
         * Fired on SearchField "search" and "liveChange" events.
         * Filters displayAssets by Asset Tag, Description, or Cost Center.
         */
        onSearch: function (oEvent) {
            var sQuery = (oEvent.getParameter("newValue") || oEvent.getSource().getValue())
                .trim().toLowerCase();

            var oModel = this.getView().getModel();
            var aAll   = oModel.getProperty("/Assets");

            var aFiltered = sQuery
                ? aAll.filter(function (o) {
                    return (
                        o.Id.toLowerCase().indexOf(sQuery) !== -1 ||
                        o.Description.toLowerCase().indexOf(sQuery) !== -1 ||
                        o.CostCenter.toLowerCase().indexOf(sQuery) !== -1
                    );
                })
                : aAll;

            oModel.setProperty("/displayAssets", aFiltered);
        },

        // ===================================================================
        // Sort
        // ===================================================================

        /**
         * Opens a ViewSettingsDialog for sort (spec: btnSort).
         */
        onSort: function () {
            var oModel = this.getView().getModel();

            if (!this._oSortDialog) {
                this._oSortDialog = new ViewSettingsDialog({
                    title: "Sort Assets",
                    sortItems: [
                        new ViewSettingsItem({ key: "MainAssetNumber", text: "Asset Number",  selected: true }),
                        new ViewSettingsItem({ key: "CostCenter",       text: "Cost Center"  }),
                        new ViewSettingsItem({ key: "Description",      text: "Description"  }),
                        new ViewSettingsItem({ key: "StatusId",         text: "Status"       })
                    ],
                    confirm: function (oEv) {
                        var sSortField   = oEv.getParameter("sortItem").getKey();
                        var bDescending  = oEv.getParameter("sortDescending");

                        var aItems = oModel.getProperty("/displayAssets").slice();
                        aItems.sort(function (a, b) {
                            var vA = a[sSortField], vB = b[sSortField];
                            if (vA < vB) { return bDescending ?  1 : -1; }
                            if (vA > vB) { return bDescending ? -1 :  1; }
                            return 0;
                        });
                        oModel.setProperty("/displayAssets", aItems);
                    }
                });
                this.getView().addDependent(this._oSortDialog);
            }

            this._oSortDialog.open();
        },

        // ===================================================================
        // Barcode Scanner  (sap.ndc.BarcodeScanner on device, dialog in browser)
        // ===================================================================

        /**
         * Attempts native BarcodeScanner; falls back to simulation dialog.
         * On success, filters the list and navigates to the matched asset.
         */
        onScanBarcode: function () {
            var that = this;
            try {
                // sap.ndc is only available in SAP Fiori Client / Zebra device
                if (sap.ndc && sap.ndc.BarcodeScanner) {
                    sap.ndc.BarcodeScanner.scan(
                        function (oResult) {
                            if (!oResult.cancelled && oResult.text) {
                                that._filterAndNavigateByTag(oResult.text.trim());
                            }
                        },
                        function (sError) {
                            MessageToast.show("Scanner error: " + sError);
                        }
                    );
                    return;
                }
            } catch (e) {
                // sap.ndc not available in desktop browser — use simulation dialog
            }
            this._openScanDialog();
        },

        _openScanDialog: function () {
            var that = this;

            // Create input & dialog once; reuse on subsequent calls
            if (!this._oScanInput) {
                this._oScanInput = new Input({
                    placeholder: "e.g. 21000004-00",
                    width: "100%",
                    submit: function () { that._onScanConfirm(); }
                });
            }

            if (!this._oScanDialog) {
                this._oScanDialog = new Dialog({
                    title: "Scan Asset Tag (Simulation)",
                    content: [
                        new VBox({
                            items: [
                                new Label({ text: "Enter Asset Tag Number:", labelFor: this._oScanInput }),
                                this._oScanInput
                            ],
                            class: "sapUiSmallMarginBeginEnd sapUiSmallMarginTopBottom"
                        })
                    ],
                    beginButton: new Button({
                        text: "Confirm Scan",
                        type: "Emphasized",
                        press: function () { that._onScanConfirm(); }
                    }),
                    endButton: new Button({
                        text: "Cancel",
                        press: function () { that._oScanDialog.close(); }
                    }),
                    afterClose: function () { that._oScanInput.setValue(""); }
                });
                this.getView().addDependent(this._oScanDialog);
            }

            this._oScanDialog.open();
            // Focus the input after dialog opens
            setTimeout(function () { that._oScanInput.focus(); }, 300);
        },

        _onScanConfirm: function () {
            var sTag = this._oScanInput.getValue().trim();
            if (!sTag) {
                MessageToast.show("Please enter an Asset Tag.");
                return;
            }
            this._oScanDialog.close();
            this._filterAndNavigateByTag(sTag);
        },

        /**
         * Filters the list to show only the matched asset, then navigates to detail.
         * @param {string} sTag - e.g. "21000004-00"
         */
        _filterAndNavigateByTag: function (sTag) {
            var oModel = this.getView().getModel();
            var aAll   = oModel.getProperty("/Assets");
            var oFound = null;

            for (var i = 0; i < aAll.length; i++) {
                if (aAll[i].Id === sTag) { oFound = aAll[i]; break; }
            }

            if (oFound) {
                oModel.setProperty("/displayAssets", [oFound]);
                var oSearch = this.byId("searchField");
                if (oSearch) { oSearch.setValue(sTag); }
                this.getOwnerComponent().getRouter().navTo("detail", {
                    objectId: encodeURIComponent(sTag)
                });
            } else {
                MessageToast.show("Asset not found: " + sTag);
            }
        },

        // ===================================================================
        // List item navigation
        // ===================================================================

        /**
         * Fired on List itemPress; navigates to the Detail page.
         */
        onItemPress: function (oEvent) {
            var oItem = oEvent.getParameter("listItem") || oEvent.getSource();
            var oCtx  = oItem.getBindingContext();
            if (!oCtx) { return; }
            var oAsset = oCtx.getObject();
            this.getOwnerComponent().getRouter().navTo("detail", {
                objectId: encodeURIComponent(oAsset.Id)
            });
        },

        // ===================================================================
        // Refresh
        // ===================================================================

        /**
         * Resets search and restores full list.
         * TODO: Replace with OData model.refresh() call.
         */
        onRefresh: function () {
            var oModel  = this.getView().getModel();
            var oSearch = this.byId("searchField");
            if (oSearch) { oSearch.setValue(""); }
            var aAll = oModel.getProperty("/Assets");
            oModel.setProperty("/displayAssets", JSON.parse(JSON.stringify(aAll)));
            MessageToast.show("Asset list refreshed.");
        },

        // ===================================================================
        // Export  (spec: Desktop — Excel/CSV download, like ZDOWNLOAD_ASSET_STAT)
        // ===================================================================

        /**
         * Exports currently visible assets as a UTF-8 CSV file.
         * Matches the column layout defined in PROTOTYPE_SPEC (section: Data Export).
         * TODO: On desktop/back-end, wire to transaction ZDOWNLOAD_ASSET_STAT.
         */
        onExport: function () {
            var oModel = this.getView().getModel();
            var aData  = oModel.getProperty("/displayAssets");
            if (!aData || aData.length === 0) {
                MessageToast.show("No data to export.");
                return;
            }
            this._downloadCSV(aData);
        },

        _downloadCSV: function (aData) {
            var esc = function (s) {
                return '"' + String(s === null || s === undefined ? "" : s).replace(/"/g, '""') + '"';
            };

            var aHeader = [
                "Asset Tag", "Asset Number", "Sub No.", "Description",
                "Inventory No.", "Serial Number", "Cost Center", "Company Code",
                "Status", "Last Counted", "User Updated"
            ];

            var aRows = aData.map(function (o) {
                return [
                    esc(o.Id), esc(o.MainAssetNumber), esc(o.SubNumber),
                    esc(o.Description), esc(o.InventoryNo), esc(o.SerialNumber),
                    esc(o.CostCenter), esc(o.CompanyCode), esc(o.StatusText),
                    esc(o.LastCountedDateFormatted), esc(o.UserUpdated)
                ].join(",");
            });

            // BOM (\uFEFF) ensures Excel opens UTF-8 correctly
            var sCSV = "\uFEFF" + aHeader.join(",") + "\n" + aRows.join("\n");
            var oBlob = new Blob([sCSV], { type: "text/csv;charset=utf-8;" });
            var sUrl  = URL.createObjectURL(oBlob);
            var oLink = document.createElement("a");
            oLink.setAttribute("href", sUrl);
            oLink.setAttribute("download",
                "AssetStatus_" + new Date().toISOString().slice(0, 10) + ".csv");
            document.body.appendChild(oLink);
            oLink.click();
            document.body.removeChild(oLink);
            setTimeout(function () { URL.revokeObjectURL(sUrl); }, 1000);
            MessageToast.show("Export complete.");
        }

    });
});
