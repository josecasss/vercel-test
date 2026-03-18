sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast"
], function (Controller, MessageToast) {
    "use strict";

    var oStatusMap = {
        "0": { text: "ASSET OK",             state: "Success",     btnType: "Accept"    },
        "1": { text: "DAMAGE",               state: "Error",       btnType: "Reject"    },
        "2": { text: "NOT MATCH COSTCENTER", state: "Warning",     btnType: "Attention" },
        "3": { text: "WRITE OFF",            state: "Warning",     btnType: "Attention" },
        "4": { text: "SOLD",                 state: "None",        btnType: "Default"   }
    };

    return Controller.extend("com.aibel.assettracking.controller.Detail", {

        onInit: function () {
            this.getOwnerComponent().getRouter()
                .getRoute("detail")
                .attachPatternMatched(this._onMatched, this);
        },

        _onMatched: function (oEvent) {
            var sId    = decodeURIComponent(oEvent.getParameter("arguments").objectId);
            var oModel = this.getView().getModel();
            var aAll   = oModel.getProperty("/Assets");
            var oFound = null;
            for (var i = 0; i < aAll.length; i++) {
                if (aAll[i].Id === sId) { oFound = aAll[i]; break; }
            }
            if (oFound) {
                oModel.setProperty("/selectedAsset",    JSON.parse(JSON.stringify(oFound)));
                oModel.setProperty("/hasSelectedAsset", true);
            } else {
                oModel.setProperty("/selectedAsset",    null);
                oModel.setProperty("/hasSelectedAsset", false);
                MessageToast.show("Asset not found: " + sId);
            }
            // Reset status select
            var oSelect = this.byId("detailStatusSelect");
            if (oSelect) { oSelect.setSelectedKey(""); }
        },

        onNavBack: function () {
            this.getOwnerComponent().getRouter().navTo("list");
        },

        /**
         * Confirm status update — same logic as List quick-update but for the
         * full detail page.  Updates selectedAsset + both master arrays.
         * TODO: Wire to OData PATCH on ZASSET_STAT_TRAC.
         */
        onConfirmStatus: function () {
            var oModel   = this.getView().getModel();
            var oSelect  = this.byId("detailStatusSelect");
            var sNewId   = oSelect ? oSelect.getSelectedKey() : "";
            var oAsset   = oModel.getProperty("/selectedAsset");

            if (!sNewId)  { MessageToast.show("Please select a new status."); return; }
            if (!oAsset)  { return; }
            if (sNewId === oAsset.StatusId) { MessageToast.show("This status is already active."); return; }

            var oNew  = oStatusMap[sNewId];
            if (!oNew) { return; }

            var oNow  = new Date();
            var pad   = function (n) { return String(n).padStart(2, "0"); };
            var sISO  = oNow.getFullYear() + "-" + pad(oNow.getMonth()+1) + "-" + pad(oNow.getDate());
            var sFmt  = pad(oNow.getDate()) + "." + pad(oNow.getMonth()+1) + "." + oNow.getFullYear();

            // 1. Update selectedAsset (drives the header ObjectStatus)
            oModel.setProperty("/selectedAsset/StatusId",                 sNewId);
            oModel.setProperty("/selectedAsset/StatusText",               oNew.text);
            oModel.setProperty("/selectedAsset/StatusState",              oNew.state);
            oModel.setProperty("/selectedAsset/LastCountedDate",          sISO);
            oModel.setProperty("/selectedAsset/LastCountedDateFormatted", sFmt);
            oModel.setProperty("/selectedAsset/UserUpdated",              "DEMO_USER");

            // 2. Sync back to master arrays so the List view stays consistent
            var sId = oAsset.Id;
            ["Assets", "displayAssets"].forEach(function (sProp) {
                var aArr = oModel.getProperty("/" + sProp);
                for (var i = 0; i < aArr.length; i++) {
                    if (aArr[i].Id === sId) {
                        aArr[i].StatusId                  = sNewId;
                        aArr[i].StatusText                = oNew.text;
                        aArr[i].StatusState               = oNew.state;
                        aArr[i].LastCountedDate           = sISO;
                        aArr[i].LastCountedDateFormatted  = sFmt;
                        aArr[i].UserUpdated               = "DEMO_USER";
                        break;
                    }
                }
                oModel.setProperty("/" + sProp, aArr);
            });

            if (oSelect) { oSelect.setSelectedKey(""); }
            MessageToast.show("Status updated → " + oNew.text);
        }
    });
});
