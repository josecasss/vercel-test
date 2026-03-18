sap.ui.define(["sap/ui/core/mvc/Controller"], function (Controller) {
    "use strict";
    return Controller.extend("com.aibel.assettracking.controller.App", {
        onInit: function () {
            var sClass = sap.ui.Device.support.touch ? "sapUiSizeCozy" : "sapUiSizeCompact";
            this.getView().addStyleClass(sClass);
        }
    });
});
