sap.ui.define([
    "sap/ui/core/mvc/Controller"
], function (Controller) {
    "use strict";

    return Controller.extend("com.prototype.goodsreceipt.controller.Detail", {

        onInit: function () {
            this.getOwnerComponent().getRouter()
                .getRoute("detail")
                .attachPatternMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: function (oEvent) {
            var sObjectId = decodeURIComponent(oEvent.getParameter("arguments").objectId);
            var oModel = this.getView().getModel();
            var aItems = oModel.getProperty("/PurchaseOrderItems");
            var oItem = aItems.find(function (item) {
                return item.Id === sObjectId;
            });
            if (oItem) {
                oModel.setProperty("/selectedItem", oItem);
            }
        },

        onNavBack: function () {
            this.getOwnerComponent().getRouter().navTo("list");
        }

    });
});
