sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast"
], function (Controller, MessageToast) {
    "use strict";

    var STATUS = {
        "00": { text: "ASSET OK",             state: "Success" },
        "01": { text: "DAMAGE",               state: "Error"   },
        "02": { text: "NOT MATCH COSTCENTER", state: "Warning" },
        "03": { text: "WRITE OFF",            state: "Warning" },
        "04": { text: "SOLD",                 state: "None"    }
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
            var oSel = this.byId("detailStatusSelect");
            if (oSel) { oSel.setSelectedKey(""); }
        },

        onNavBack: function () {
            this.getOwnerComponent().getRouter().navTo("list");
        },

        /**
         * Confirm status update from Detail page.
         * TODO: Replace with OData PATCH to ZASSET_STAT_TRAC
         *       Fields: StatusId, LastCountedDate (AEDAT), UserUpdated (AENAM)
         */
        onConfirmStatus: function () {
            var oModel  = this.getView().getModel();
            var oSel    = this.byId("detailStatusSelect");
            var sNewId  = oSel ? oSel.getSelectedKey() : "";
            var oAsset  = oModel.getProperty("/selectedAsset");

            if (!sNewId)  { MessageToast.show("Please select a new status."); return; }
            if (!oAsset)  { return; }
            if (sNewId === oAsset.StatusId) {
                MessageToast.show("This status is already active.");
                return;
            }

            var oNew  = STATUS[sNewId];
            if (!oNew) { return; }

            var oNow    = new Date();
            var pad     = function (n) { return String(n).padStart(2, "0"); };
            var sISO    = oNow.getFullYear() + "-" + pad(oNow.getMonth()+1) + "-" + pad(oNow.getDate());
            var _m      = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
            var sFiori  = _m[oNow.getMonth()] + " " + oNow.getDate() + ", " + oNow.getFullYear();
            var sDot    = pad(oNow.getDate()) + "." + pad(oNow.getMonth()+1) + "." + oNow.getFullYear();

            oModel.setProperty("/selectedAsset/StatusId",                 sNewId);
            oModel.setProperty("/selectedAsset/StatusText",               oNew.text);
            oModel.setProperty("/selectedAsset/StatusState",              oNew.state);
            oModel.setProperty("/selectedAsset/LastCountedDate",          sISO);
            oModel.setProperty("/selectedAsset/LastCountedDateFmt",       sFiori);
            oModel.setProperty("/selectedAsset/LastCountedDateFormatted", sDot);
            oModel.setProperty("/selectedAsset/UserUpdated",              "DEMO_USER");

            var sId = oAsset.Id;
            ["Assets", "displayAssets"].forEach(function (sProp) {
                var aArr = oModel.getProperty("/" + sProp);
                for (var i = 0; i < aArr.length; i++) {
                    if (aArr[i].Id === sId) {
                        aArr[i].StatusId                  = sNewId;
                        aArr[i].StatusText                = oNew.text;
                        aArr[i].StatusState               = oNew.state;
                        aArr[i].LastCountedDate           = sISO;
                        aArr[i].LastCountedDateFmt        = sFiori;
                        aArr[i].LastCountedDateFormatted  = sDot;
                        aArr[i].UserUpdated               = "DEMO_USER";
                        break;
                    }
                }
                oModel.setProperty("/" + sProp, aArr);
            });

            if (oSel) { oSel.setSelectedKey(""); }
            MessageToast.show("Status updated → " + oNew.text);
        }
    });
});
