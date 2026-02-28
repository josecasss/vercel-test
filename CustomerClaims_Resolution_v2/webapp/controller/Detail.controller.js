sap.ui.define([
    "sap/ui/core/mvc/Controller"
], function (Controller) {
    "use strict";

    return Controller.extend("com.prototype.claims.controller.Detail", {

        onInit: function () {
            this.getOwnerComponent().getRouter()
                .getRoute("detail")
                .attachPatternMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: function (oEvent) {
            var sObjectId = decodeURIComponent(oEvent.getParameter("arguments").objectId);
            var oModel    = this.getView().getModel();
            if (!oModel) { return; }

            var aItems = oModel.getProperty("/CustomerClaims");
            var oItem  = aItems.find(function (item) {
                return item.Id === sObjectId;
            });

            if (oItem) {
                oModel.setProperty("/selectedItem", oItem);
            }

            // Scroll Object Page back to top on every navigation
            var oPage = this.byId("objectPageLayout");
            if (oPage && oPage.scrollToSection) {
                oPage.scrollToSection("sectionGeneral", 0);
            }
        },

        onNavBack: function () {
            this.getOwnerComponent().getRouter().navTo("list");
        }

    });
});
