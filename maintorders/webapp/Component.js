sap.ui.define([
  "sap/ui/core/UIComponent",
  "com/prototype/maintorders/model/models"
], function (UIComponent, models) {
  "use strict";

  return UIComponent.extend("com.prototype.maintorders.Component", {

    metadata: {
      manifest: "json"
    },

    init: function () {
      UIComponent.prototype.init.apply(this, arguments);
      this.setModel(models.createDataModel());
      this.getRouter().initialize();
    }

  });
});
