sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast"
], function (Controller, MessageToast) {
    "use strict";

    // -----------------------------------------------------------------------
    // Status map — mirrors ZASSET_STAT_CODE, duplicated here to keep the
    // controller self-contained (avoids circular dep with models.js).
    // TODO: In real app, fetch from OData ValueHelp set.
    // -----------------------------------------------------------------------
    var oStatusMap = {
        "0": { text: "ASSET OK",             state: "Success" },
        "1": { text: "DAMAGE",               state: "Error"   },
        "2": { text: "NOT MATCH COSTCENTER", state: "Warning" },
        "3": { text: "WRITE OFF",            state: "Warning" },
        "4": { text: "SOLD",                 state: "None"    }
    };

    return Controller.extend("com.aibel.assettracking.controller.Detail", {

        // ===================================================================
        // Lifecycle
        // ===================================================================

        onInit: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.getRoute("detail").attachPatternMatched(this._onDetailMatched, this);
            oRouter.getRoute("list").attachPatternMatched(this._onListMatched, this);
        },

        // ===================================================================
        // Route handlers
        // ===================================================================

        /**
         * Route "detail" matched: decode objectId, find asset, set model.
         */
        _onDetailMatched: function (oEvent) {
            var sObjectId = decodeURIComponent(oEvent.getParameter("arguments").objectId);
            var oModel    = this.getView().getModel();
            var aAssets   = oModel.getProperty("/Assets");

            var oFound = null;
            for (var i = 0; i < aAssets.length; i++) {
                if (aAssets[i].Id === sObjectId) { oFound = aAssets[i]; break; }
            }

            if (oFound) {
                // Deep-copy so edits to selectedAsset don't affect the master array
                oModel.setProperty("/selectedAsset",    JSON.parse(JSON.stringify(oFound)));
                oModel.setProperty("/hasSelectedAsset", true);
            } else {
                oModel.setProperty("/selectedAsset",    null);
                oModel.setProperty("/hasSelectedAsset", false);
                MessageToast.show("Asset not found: " + sObjectId);
            }

            // Always reset the status select on navigation
            this._resetStatusSelect();
        },

        /**
         * Route "list" matched: clear detail pane (SplitApp empty state).
         */
        _onListMatched: function () {
            var oModel = this.getView().getModel();
            oModel.setProperty("/selectedAsset",    null);
            oModel.setProperty("/hasSelectedAsset", false);
            this._resetStatusSelect();
        },

        _resetStatusSelect: function () {
            var oSelect = this.byId("statusSelect");
            if (oSelect) { oSelect.setSelectedKey(""); }
        },

        // ===================================================================
        // Navigation
        // ===================================================================

        /**
         * Back button: navigate to the list route.
         * SplitApp handles the master/detail switching on mobile automatically.
         */
        onNavBack: function () {
            this.getOwnerComponent().getRouter().navTo("list");
        },

        // ===================================================================
        // Status update  (spec: Section 2 — Status Update Action Area)
        // ===================================================================

        /**
         * Validates selection, updates model, syncs back to master arrays.
         * Also updates LastCountedDate → today, UserUpdated → DEMO_USER.
         * TODO: Replace with OData PATCH / POST to ZASSET_STAT_TRAC entity.
         */
        onConfirmStatus: function () {
            var oModel      = this.getView().getModel();
            var oSelect     = this.byId("statusSelect");
            var sNewId      = oSelect.getSelectedKey();

            // Validation
            if (!sNewId) {
                MessageToast.show("Please select a new status first.");
                return;
            }

            var oAsset = oModel.getProperty("/selectedAsset");
            if (!oAsset) { return; }

            if (sNewId === oAsset.StatusId) {
                MessageToast.show("The selected status is already active.");
                return;
            }

            var oNewStatus = oStatusMap[sNewId];
            if (!oNewStatus) { return; }

            // Build today's date in both ISO and display format
            var oNow      = new Date();
            var pad       = function (n) { return String(n).padStart(2, "0"); };
            var sISOToday = oNow.getFullYear() + "-" + pad(oNow.getMonth() + 1) + "-" + pad(oNow.getDate());
            var sFmtToday = pad(oNow.getDate()) + "." + pad(oNow.getMonth() + 1) + "." + oNow.getFullYear();

            // 1. Update the displayed selectedAsset (drives the ObjectHeader / status display)
            oModel.setProperty("/selectedAsset/StatusId",                sNewId);
            oModel.setProperty("/selectedAsset/StatusText",              oNewStatus.text);
            oModel.setProperty("/selectedAsset/StatusState",             oNewStatus.state);
            oModel.setProperty("/selectedAsset/LastCountedDate",         sISOToday);
            oModel.setProperty("/selectedAsset/LastCountedDateFormatted", sFmtToday);
            oModel.setProperty("/selectedAsset/UserUpdated",             "DEMO_USER");

            // 2. Sync back to both master arrays so the List view stays in sync
            var sId = oAsset.Id;
            ["Assets", "displayAssets"].forEach(function (sProp) {
                var aArr = oModel.getProperty("/" + sProp);
                for (var i = 0; i < aArr.length; i++) {
                    if (aArr[i].Id === sId) {
                        aArr[i].StatusId                 = sNewId;
                        aArr[i].StatusText               = oNewStatus.text;
                        aArr[i].StatusState              = oNewStatus.state;
                        aArr[i].LastCountedDate          = sISOToday;
                        aArr[i].LastCountedDateFormatted = sFmtToday;
                        aArr[i].UserUpdated              = "DEMO_USER";
                        break;
                    }
                }
                // Trigger JSONModel change notification for the array binding
                oModel.setProperty("/" + sProp, aArr);
            });

            // 3. Reset select and notify user
            this._resetStatusSelect();
            // TODO: Remove toast; show MessageBox.success in real app
            MessageToast.show("Status updated to: " + oNewStatus.text);
        }

    });
});
