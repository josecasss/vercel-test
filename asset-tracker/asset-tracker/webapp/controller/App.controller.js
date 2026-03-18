sap.ui.define([
    "sap/ui/core/mvc/Controller"
], function (Controller) {
    "use strict";

    return Controller.extend("com.aibel.assettracking.controller.App", {

        onInit: function () {
            // App-level initialisation.
            // Content density class (compact on desktop, cozy on touch devices)
            var sClass = this._getContentDensityClass();
            this.getView().addStyleClass(sClass);
        },

        _getContentDensityClass: function () {
            if (!this._sContentDensityClass) {
                if (document.body.classList.contains("sapUiSizeCozy") ||
                    !sap.ui.Device.support.touch) {
                    this._sContentDensityClass = "sapUiSizeCompact";
                } else {
                    this._sContentDensityClass = "sapUiSizeCozy";
                }
            }
            return this._sContentDensityClass;
        }

    });
});
