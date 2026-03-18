sap.ui.define([
  "sap/ui/model/json/JSONModel"
], function (JSONModel) {
  "use strict";

  function formatDate(sDate) {
    if (!sDate) return "";
    var aParts = sDate.split("-");
    return aParts[2] + "." + aParts[1] + "." + aParts[0];
  }

  return {
    createDataModel: function () {
      // TODO: Replace with OData service call (e.g. /sap/opu/odata/sap/PM_ORDER_SRV)
      var aOrders = [
        {
          OrderId: "WO-10001",
          Description: "Centrifugal pump overhaul — Unit A",
          Equipment: "PUMP-A01",
          Priority: "High",
          Status: "Open",
          PlannedStart: "2026-03-20",
          PlannedEnd: "2026-03-22",
          Responsible: "J. Schmidt",
          Plant: "PL01",
          Notes: "Seal and bearing replacement required. Parts on order."
        },
        {
          OrderId: "WO-10002",
          Description: "Conveyor belt tension & alignment check",
          Equipment: "CONV-B12",
          Priority: "Medium",
          Status: "In Progress",
          PlannedStart: "2026-03-18",
          PlannedEnd: "2026-03-19",
          Responsible: "M. Kowalski",
          Plant: "PL02",
          Notes: "Lubrication also required on all idler rollers."
        },
        {
          OrderId: "WO-10003",
          Description: "Electrical cabinet preventive maintenance",
          Equipment: "ELEC-C03",
          Priority: "Low",
          Status: "Approved",
          PlannedStart: "2026-03-25",
          PlannedEnd: "2026-03-25",
          Responsible: "A. Fischer",
          Plant: "PL01",
          Notes: "Clean filters, check terminal tightness."
        },
        {
          OrderId: "WO-10004",
          Description: "Compressor mechanical seal replacement",
          Equipment: "COMP-D07",
          Priority: "High",
          Status: "Open",
          PlannedStart: "2026-03-21",
          PlannedEnd: "2026-03-24",
          Responsible: "P. Müller",
          Plant: "PL03",
          Notes: "Unit showing minor gas leakage at shaft seal."
        },
        {
          OrderId: "WO-10005",
          Description: "Heat exchanger chemical cleaning",
          Equipment: "HEX-E02",
          Priority: "Medium",
          Status: "Rejected",
          PlannedStart: "2026-03-15",
          PlannedEnd: "2026-03-16",
          Responsible: "L. Weber",
          Plant: "PL02",
          Notes: "Rejected: missing safety permit. Resubmit with PTW."
        },
        {
          OrderId: "WO-10006",
          Description: "Safety relief valve calibration & test",
          Equipment: "VALV-F11",
          Priority: "High",
          Status: "In Progress",
          PlannedStart: "2026-03-19",
          PlannedEnd: "2026-03-20",
          Responsible: "K. Bauer",
          Plant: "PL01",
          Notes: "Annual statutory calibration. Test bench booked."
        },
        {
          OrderId: "WO-10007",
          Description: "Drive motor bearing replacement",
          Equipment: "MOT-G05",
          Priority: "High",
          Status: "Open",
          PlannedStart: "2026-03-23",
          PlannedEnd: "2026-03-23",
          Responsible: "H. Richter",
          Plant: "PL03",
          Notes: "Vibration analysis confirmed inner race fault."
        },
        {
          OrderId: "WO-10008",
          Description: "Tank level sensor calibration",
          Equipment: "SENS-H09",
          Priority: "Low",
          Status: "Approved",
          PlannedStart: "2026-03-26",
          PlannedEnd: "2026-03-26",
          Responsible: "E. Hoffmann",
          Plant: "PL02",
          Notes: "Quarterly instrument calibration cycle."
        },
        {
          OrderId: "WO-10009",
          Description: "Cooling tower full PM service",
          Equipment: "COOL-I01",
          Priority: "Medium",
          Status: "Open",
          PlannedStart: "2026-03-28",
          PlannedEnd: "2026-03-30",
          Responsible: "R. Schäfer",
          Plant: "PL01",
          Notes: "Fan, drift eliminators, fill media inspection."
        },
        {
          OrderId: "WO-10010",
          Description: "Hydraulic press cylinder seal service",
          Equipment: "HYDR-J04",
          Priority: "Medium",
          Status: "In Progress",
          PlannedStart: "2026-03-17",
          PlannedEnd: "2026-03-18",
          Responsible: "N. Zimmermann",
          Plant: "PL03",
          Notes: "Oil seepage detected at rod seal. Pressure test afterwards."
        }
      ];

      aOrders.forEach(function (oOrder) {
        oOrder.PlannedStartFormatted = formatDate(oOrder.PlannedStart);
        oOrder.PlannedEndFormatted   = formatDate(oOrder.PlannedEnd);
      });

      return new JSONModel({
        MaintenanceOrders: aOrders,
        displayOrders: aOrders.slice(),
        selectedItem: null,
        orderCount: aOrders.length,
        newOrder: {
          Description: "",
          Equipment: "",
          Priority: "Medium",
          PlannedStart: "",
          PlannedEnd: "",
          Responsible: "",
          Plant: ""
        }
      });
    }
  };
});
