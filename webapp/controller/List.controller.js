sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/m/MessageBox",
  "sap/m/MessageToast",
  "sap/ui/export/Spreadsheet",
  "sap/ui/export/library"
], function (Controller, MessageBox, MessageToast, Spreadsheet, exportLibrary) {
  "use strict";

  return Controller.extend("com.prototype.maintorders.controller.List", {

    // ─────────────────────────────────────────────────────────────────────────
    // Lifecycle
    // ─────────────────────────────────────────────────────────────────────────

    onInit: function () {
      // No route attachment needed — List is the default (empty pattern) route
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
    // Search / Filter
    // ─────────────────────────────────────────────────────────────────────────

    onSearch: function (oEvent) {
      this._applySearch(oEvent.getParameter("query") || "");
    },

    onSearchLive: function (oEvent) {
      this._applySearch(oEvent.getParameter("newValue") || "");
    },

    _applySearch: function (sQuery) {
      var oModel      = this.getView().getModel();
      var aAllOrders  = oModel.getProperty("/MaintenanceOrders");

      if (!sQuery.trim()) {
        oModel.setProperty("/displayOrders", aAllOrders.slice());
        oModel.setProperty("/orderCount", aAllOrders.length);
        return;
      }

      var sLower = sQuery.toLowerCase();
      var aFiltered = aAllOrders.filter(function (oOrder) {
        return (
          oOrder.OrderId.toLowerCase().indexOf(sLower)      >= 0 ||
          oOrder.Description.toLowerCase().indexOf(sLower)  >= 0 ||
          oOrder.Equipment.toLowerCase().indexOf(sLower)    >= 0 ||
          oOrder.Responsible.toLowerCase().indexOf(sLower)  >= 0 ||
          oOrder.Status.toLowerCase().indexOf(sLower)       >= 0 ||
          oOrder.Plant.toLowerCase().indexOf(sLower)        >= 0
        );
      });

      oModel.setProperty("/displayOrders", aFiltered);
      oModel.setProperty("/orderCount", aFiltered.length);
    },

    // ─────────────────────────────────────────────────────────────────────────
    // Selection — toggle action buttons
    // ─────────────────────────────────────────────────────────────────────────

    onSelectionChange: function () {
      var bHasSelection = this.byId("ordersTable").getSelectedItems().length > 0;
      this.byId("btnApprove").setEnabled(bHasSelection);
      this.byId("btnReject").setEnabled(bHasSelection);
      this.byId("btnDelete").setEnabled(bHasSelection);
    },

    // ─────────────────────────────────────────────────────────────────────────
    // Navigation
    // ─────────────────────────────────────────────────────────────────────────

    onItemPress: function (oEvent) {
      var oItem = oEvent.getSource().getBindingContext().getObject();
      this.getOwnerComponent().getRouter().navTo("detail", {
        objectId: encodeURIComponent(oItem.OrderId)
      });
    },

    // ─────────────────────────────────────────────────────────────────────────
    // Action: CREATE
    // ─────────────────────────────────────────────────────────────────────────

    onCreateOrder: function () {
      // Reset new order draft
      this.getView().getModel().setProperty("/newOrder", {
        Description: "",
        Equipment:   "",
        Priority:    "Medium",
        PlannedStart: "",
        PlannedEnd:   "",
        Responsible:  "",
        Plant:        ""
      });

      if (!this._oCreateDialog) {
        this._oCreateDialog = sap.ui.xmlfragment(
          this.getView().getId(),
          "com.prototype.maintorders.fragment.CreateOrderDialog",
          this
        );
        this.getView().addDependent(this._oCreateDialog);
      }
      this._oCreateDialog.open();
    },

    onConfirmCreate: function () {
      var oModel = this.getView().getModel();
      var oNew   = oModel.getProperty("/newOrder");

      if (!oNew.Description || !oNew.Equipment) {
        MessageBox.error(this._text("errorRequiredFields"));
        return;
      }

      // Auto-generate next Order ID
      var aOrders = oModel.getProperty("/MaintenanceOrders");
      var nMaxId = aOrders.reduce(function (nMax, oOrder) {
        var n = parseInt(oOrder.OrderId.replace("WO-", ""), 10);
        return n > nMax ? n : nMax;
      }, 10000);
      var sNewId = "WO-" + (nMaxId + 1);

      function fmtDate(s) {
        if (!s) return "";
        var p = s.split("-");
        return p[2] + "." + p[1] + "." + p[0];
      }

      var oOrder = {
        OrderId:              sNewId,
        Description:          oNew.Description,
        Equipment:            oNew.Equipment,
        Priority:             oNew.Priority || "Medium",
        Status:               "Open",
        PlannedStart:         oNew.PlannedStart || "",
        PlannedEnd:           oNew.PlannedEnd   || "",
        PlannedStartFormatted: fmtDate(oNew.PlannedStart),
        PlannedEndFormatted:   fmtDate(oNew.PlannedEnd),
        Responsible:          oNew.Responsible || "",
        Plant:                oNew.Plant       || "",
        Notes:                ""
      };

      // TODO: Replace with POST call to OData service
      aOrders.unshift(oOrder);   // add at top
      oModel.setProperty("/MaintenanceOrders", aOrders);
      oModel.setProperty("/displayOrders", aOrders.slice());
      oModel.setProperty("/orderCount", aOrders.length);

      this._oCreateDialog.close();
      MessageToast.show(this._text("msgOrderCreated", [sNewId]));
    },

    onCancelCreate: function () {
      this._oCreateDialog.close();
    },

    // ─────────────────────────────────────────────────────────────────────────
    // Action: APPROVE
    // ─────────────────────────────────────────────────────────────────────────

    onApprove: function () {
      var aSelected = this.byId("ordersTable").getSelectedItems();
      if (!aSelected.length) {
        MessageBox.warning(this._text("errorNoSelection"));
        return;
      }
      var that = this;
      MessageBox.confirm(
        this._text("confirmApprove", [aSelected.length]),
        {
          title: this._text("titleApprove"),
          actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
          emphasizedAction: MessageBox.Action.OK,
          onClose: function (sAction) {
            if (sAction === MessageBox.Action.OK) {
              that._changeStatus(aSelected, "Approved");
              MessageToast.show(that._text("msgApproved", [aSelected.length]));
            }
          }
        }
      );
    },

    // ─────────────────────────────────────────────────────────────────────────
    // Action: REJECT
    // ─────────────────────────────────────────────────────────────────────────

    onReject: function () {
      var aSelected = this.byId("ordersTable").getSelectedItems();
      if (!aSelected.length) {
        MessageBox.warning(this._text("errorNoSelection"));
        return;
      }
      var that = this;
      MessageBox.confirm(
        this._text("confirmReject", [aSelected.length]),
        {
          title: this._text("titleReject"),
          actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
          emphasizedAction: MessageBox.Action.CANCEL,
          onClose: function (sAction) {
            if (sAction === MessageBox.Action.OK) {
              that._changeStatus(aSelected, "Rejected");
              MessageToast.show(that._text("msgRejected", [aSelected.length]));
            }
          }
        }
      );
    },

    // ─────────────────────────────────────────────────────────────────────────
    // Action: DELETE
    // ─────────────────────────────────────────────────────────────────────────

    onDelete: function () {
      var aSelected = this.byId("ordersTable").getSelectedItems();
      if (!aSelected.length) {
        MessageBox.warning(this._text("errorNoSelection"));
        return;
      }
      var that = this;
      MessageBox.confirm(
        this._text("confirmDelete", [aSelected.length]),
        {
          title: this._text("titleDelete"),
          actions: [MessageBox.Action.DELETE, MessageBox.Action.CANCEL],
          emphasizedAction: MessageBox.Action.CANCEL,
          onClose: function (sAction) {
            if (sAction === MessageBox.Action.DELETE) {
              var oModel = that.getView().getModel();
              var aIds   = aSelected.map(function (oItem) {
                return oItem.getBindingContext().getObject().OrderId;
              });

              function notInIds(oOrder) {
                return aIds.indexOf(oOrder.OrderId) < 0;
              }

              var aNewAll     = oModel.getProperty("/MaintenanceOrders").filter(notInIds);
              var aNewDisplay = oModel.getProperty("/displayOrders").filter(notInIds);

              // TODO: Replace with DELETE call to OData service
              oModel.setProperty("/MaintenanceOrders", aNewAll);
              oModel.setProperty("/displayOrders", aNewDisplay);
              oModel.setProperty("/orderCount", aNewDisplay.length);

              // Reset selection button states
              that.byId("btnApprove").setEnabled(false);
              that.byId("btnReject").setEnabled(false);
              that.byId("btnDelete").setEnabled(false);

              MessageToast.show(that._text("msgDeleted", [aIds.length]));
            }
          }
        }
      );
    },

    // ─────────────────────────────────────────────────────────────────────────
    // Action: EXPORT TO EXCEL
    // ─────────────────────────────────────────────────────────────────────────

    onExport: function () {
      var oModel = this.getView().getModel();
      var aData  = oModel.getProperty("/displayOrders");
      var EdmType = exportLibrary.EdmType;

      var oSettings = {
        workbook: {
          columns: [
            { label: "Order ID",      property: "OrderId",              type: EdmType.String, width: 12 },
            { label: "Description",   property: "Description",          type: EdmType.String, width: 42 },
            { label: "Equipment",     property: "Equipment",            type: EdmType.String, width: 12 },
            { label: "Priority",      property: "Priority",             type: EdmType.String, width: 10 },
            { label: "Status",        property: "Status",               type: EdmType.String, width: 13 },
            { label: "Planned Start", property: "PlannedStartFormatted",type: EdmType.String, width: 14 },
            { label: "Planned End",   property: "PlannedEndFormatted",  type: EdmType.String, width: 14 },
            { label: "Responsible",   property: "Responsible",          type: EdmType.String, width: 18 },
            { label: "Plant",         property: "Plant",                type: EdmType.String, width: 8  },
            { label: "Notes",         property: "Notes",                type: EdmType.String, width: 50 }
          ],
          context: {
            sheetName: "Maintenance Orders"
          }
        },
        dataSource: aData,
        fileName: "MaintenanceOrders_Export.xlsx"
      };

      // TODO: Replace dataSource with OData service binding for large datasets
      var oSheet = new Spreadsheet(oSettings);
      oSheet.build().finally(function () {
        oSheet.destroy();
      });
    },

    // ─────────────────────────────────────────────────────────────────────────
    // Private helpers
    // ─────────────────────────────────────────────────────────────────────────

    _changeStatus: function (aSelectedItems, sStatus) {
      var oModel   = this.getView().getModel();
      var aAll     = oModel.getProperty("/MaintenanceOrders");
      var aDisplay = oModel.getProperty("/displayOrders");

      aSelectedItems.forEach(function (oItem) {
        var sId = oItem.getBindingContext().getObject().OrderId;
        [aAll, aDisplay].forEach(function (aArr) {
          var oFound = aArr.filter(function (o) { return o.OrderId === sId; })[0];
          if (oFound) { oFound.Status = sStatus; }
        });
      });

      // TODO: Replace with PATCH/PUT calls to OData service
      oModel.setProperty("/MaintenanceOrders", aAll);
      oModel.setProperty("/displayOrders", aDisplay);
      this.byId("ordersTable").removeSelections(true);
      this.byId("btnApprove").setEnabled(false);
      this.byId("btnReject").setEnabled(false);
      this.byId("btnDelete").setEnabled(false);
    },

    _text: function (sKey, aArgs) {
      return this.getView().getModel("i18n").getResourceBundle().getText(sKey, aArgs);
    }

  });
});
