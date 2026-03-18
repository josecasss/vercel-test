sap.ui.define([
    "sap/ui/core/UIComponent",
    "com/aibel/assettracking/model/models"
], function (UIComponent, models) {
    "use strict";

    return UIComponent.extend("com.aibel.assettracking.Component", {

        metadata: {
            manifest: "json"
        },

        init: function () {
            // Call super init first
            UIComponent.prototype.init.apply(this, arguments);

            // Set the main data model
            this.setModel(models.createDataModel());

            // Initialize the router (reads config from manifest.json)
            this.getRouter().initialize();
        }
    });
});
