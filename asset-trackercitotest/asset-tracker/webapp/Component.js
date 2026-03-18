sap.ui.define([
    "sap/ui/core/UIComponent",
    "com/aibel/assettracking/model/models"
], function (UIComponent, models) {
    "use strict";
    return UIComponent.extend("com.aibel.assettracking.Component", {
        metadata: { manifest: "json" },
        init: function () {
            UIComponent.prototype.init.apply(this, arguments);
            this.setModel(models.createDataModel());
            this.getRouter().initialize();
        }
    });
});
