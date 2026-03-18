sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/m/MessageBox",
  "sap/m/MessageToast"
], function (Controller, MessageBox, MessageToast) {
  "use strict";

  return Controller.extend("com.prototype.maintorders.controller.Detail", {

    // ─────────────────────────────────────────────────────────────────────────
    // Lifecycle
    // ─────────────────────────────────────────────────────────────────────────

    onInit: function () {
      this.getOwnerComponent()
        .getRouter()
        .getRoute("detail")
        .attachPatternMatched(this._onRouteMatched, this);
    },

    _onRouteMatched: function (oEvent) {
      var sObjectId = decodeURIComponent(oEvent.getParameter("arguments").objectId);
      var oModel    = this.getView().getModel();
      var aOrders   = oModel.getProperty("/MaintenanceOrders");
      var oItem     = aOrders.filter(function (o) { return o.OrderId === sObjectId; })[0];

      if (oItem) {
        oModel.setProperty("/selectedItem", oItem);
      }
    },

    // ─────────────────────────────────────────────────────────────────────────
    // Formatters
    // ─────────────────────────────────────────────────────────────────────────

    formatStatus: function (sStatus) {
      var mMap = {
        "Open":        "None",
        "In Progress": "Warning",
        "Approved":    "Success",
        "Rejected":    "Error",
        "Completed":   "Success"
      };
      return mMap[sStatus] || "None";
    },

    formatStatusIcon: function (sStatus) {
      var mMap = {
        "Open":        "sap-icon://status-inactive",
        "In Progress": "sap-icon://status-in-process",
        "Approved":    "sap-icon://status-positive",
        "Rejected":    "sap-icon://status-negative",
        "Completed":   "sap-icon://status-completed"
      };
      return mMap[sStatus] || "";
    },

    formatPriority: function (sPriority) {
      var mMap = {
        "High":   "Error",
        "Medium": "Warning",
        "Low":    "None"
      };
      return mMap[sPriority] || "None";
    },

    // ─────────────────────────────────────────────────────────────────────────
    // Actions
    // ─────────────────────────────────────────────────────────────────────────

    onApprove: function () {
      var that = this;
      MessageBox.confirm("Approve this maintenance order?", {
        title: "Approve Order",
        actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
        emphasizedAction: MessageBox.Action.OK,
        onClose: function (sAction) {
          if (sAction === MessageBox.Action.OK) {
            that._updateStatus("Approved");
            MessageToast.show("Order approved successfully.");
          }
        }
      });
    },

    onReject: function () {
      var that = this;
      MessageBox.confirm("Reject this maintenance order?", {
        title: "Reject Order",
        actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
        emphasizedAction: MessageBox.Action.CANCEL,
        onClose: function (sAction) {
          if (sAction === MessageBox.Action.OK) {
            that._updateStatus("Rejected");
            MessageToast.show("Order rejected.");
          }
        }
      });
    },

    onNavBack: function () {
      this.getOwnerComponent().getRouter().navTo("list");
    },

    // ─────────────────────────────────────────────────────────────────────────
    // Private helpers
    // ─────────────────────────────────────────────────────────────────────────

    _updateStatus: function (sStatus) {
      var oModel    = this.getView().getModel();
      var oSelected = oModel.getProperty("/selectedItem");
      var aAll      = oModel.getProperty("/MaintenanceOrders");
      var aDisplay  = oModel.getProperty("/displayOrders");

      [aAll, aDisplay].forEach(function (aArr) {
        var oFound = aArr.filter(function (o) { return o.OrderId === oSelected.OrderId; })[0];
        if (oFound) { oFound.Status = sStatus; }
      });

      // TODO: Replace with PATCH call to OData service
      oSelected.Status = sStatus;
      oModel.setProperty("/MaintenanceOrders", aAll);
      oModel.setProperty("/displayOrders", aDisplay);
      oModel.setProperty("/selectedItem", oSelected);
    }

  });
});
