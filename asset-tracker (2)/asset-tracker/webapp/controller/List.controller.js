sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/Fragment",
    "sap/m/MessageToast",
    "sap/m/ViewSettingsDialog",
    "sap/m/ViewSettingsItem"
], function (Controller, Fragment, MessageToast, ViewSettingsDialog, ViewSettingsItem) {
    "use strict";

    // -----------------------------------------------------------------------
    // Status map (mirrors ZASSET_STAT_CODE — kept local to avoid circular dep)
    // TODO: Replace with OData metadata read in production
    // -----------------------------------------------------------------------
    var oStatusMap = {
        "0": { text: "ASSET OK",             state: "Success",     btnType: "Accept"    },
        "1": { text: "DAMAGE",               state: "Error",       btnType: "Reject"    },
        "2": { text: "NOT MATCH COSTCENTER", state: "Warning",     btnType: "Attention" },
        "3": { text: "WRITE OFF",            state: "Warning",     btnType: "Attention" },
        "4": { text: "SOLD",                 state: "None",        btnType: "Default"   }
    };

    // -----------------------------------------------------------------------
    // Private camera state (instance-level, not on the model)
    // -----------------------------------------------------------------------
    var _oStream           = null;   // MediaStream reference (for cleanup)
    var _iAnimationFrame   = null;   // requestAnimationFrame id
    var _bScannerActive    = false;  // guard against re-entrant frame callbacks

    return Controller.extend("com.aibel.assettracking.controller.List", {

        // ===================================================================
        // Lifecycle
        // ===================================================================

        onInit: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.getRoute("list").attachPatternMatched(this._onRouteMatched, this);
        },

        onExit: function () {
            // Always release camera when the controller is destroyed
            this._stopCamera();
        },

        _onRouteMatched: function () {
            // Intentionally empty — hook for future OData refresh
        },

        // ===================================================================
        // Search / Filter
        // ===================================================================

        onSearch: function (oEvent) {
            var sQ = (oEvent.getParameter("newValue") || oEvent.getSource().getValue())
                        .trim().toLowerCase();
            var oModel  = this.getView().getModel();
            var aAll    = oModel.getProperty("/Assets");
            var aResult = sQ ? aAll.filter(function (o) {
                return o.Id.toLowerCase().indexOf(sQ) !== -1 ||
                       o.Description.toLowerCase().indexOf(sQ) !== -1 ||
                       o.CostCenter.toLowerCase().indexOf(sQ) !== -1;
            }) : aAll;
            oModel.setProperty("/displayAssets", aResult);
        },

        // ===================================================================
        // Sort
        // ===================================================================

        onSort: function () {
            var oModel = this.getView().getModel();
            if (!this._oSortDialog) {
                this._oSortDialog = new ViewSettingsDialog({
                    title: "Sort Assets",
                    sortItems: [
                        new ViewSettingsItem({ key: "MainAssetNumber", text: "Asset Number", selected: true }),
                        new ViewSettingsItem({ key: "CostCenter",      text: "Cost Center"  }),
                        new ViewSettingsItem({ key: "Description",     text: "Description"  }),
                        new ViewSettingsItem({ key: "StatusId",        text: "Status"       })
                    ],
                    confirm: function (oEv) {
                        var sKey  = oEv.getParameter("sortItem").getKey();
                        var bDesc = oEv.getParameter("sortDescending");
                        var aItems = oModel.getProperty("/displayAssets").slice();
                        aItems.sort(function (a, b) {
                            if (a[sKey] < b[sKey]) { return bDesc ?  1 : -1; }
                            if (a[sKey] > b[sKey]) { return bDesc ? -1 :  1; }
                            return 0;
                        });
                        oModel.setProperty("/displayAssets", aItems);
                    }
                });
                this.getView().addDependent(this._oSortDialog);
            }
            this._oSortDialog.open();
        },

        // ===================================================================
        // Navigation → Detail page
        // ===================================================================

        onItemPress: function (oEvent) {
            var oCtx   = oEvent.getParameter("listItem").getBindingContext();
            if (!oCtx) { return; }
            var oAsset = oCtx.getObject();
            this.getOwnerComponent().getRouter().navTo("detail", {
                objectId: encodeURIComponent(oAsset.Id)
            });
        },

        // ===================================================================
        // Refresh
        // ===================================================================

        onRefresh: function () {
            var oModel = this.getView().getModel();
            var oSF    = this.byId("searchField");
            if (oSF) { oSF.setValue(""); }
            var aAll   = oModel.getProperty("/Assets");
            oModel.setProperty("/displayAssets", JSON.parse(JSON.stringify(aAll)));
            MessageToast.show("List refreshed.");
        },

        // ===================================================================
        // Export
        // ===================================================================

        onExport: function () {
            var aData = this.getView().getModel().getProperty("/displayAssets");
            if (!aData || !aData.length) { MessageToast.show("No data to export."); return; }
            var esc = function (v) {
                return '"' + String(v == null ? "" : v).replace(/"/g, '""') + '"';
            };
            var aHeader = ["Asset Tag","Asset Number","Sub No.","Description","Inventory No.",
                           "Serial Number","Cost Center","Company Code","Status","Last Counted","User Updated"];
            var aRows   = aData.map(function (o) {
                return [esc(o.Id), esc(o.MainAssetNumber), esc(o.SubNumber), esc(o.Description),
                        esc(o.InventoryNo), esc(o.SerialNumber), esc(o.CostCenter), esc(o.CompanyCode),
                        esc(o.StatusText), esc(o.LastCountedDateFormatted), esc(o.UserUpdated)].join(",");
            });
            var sCSV  = "\uFEFF" + aHeader.join(",") + "\n" + aRows.join("\n");
            var oBlob = new Blob([sCSV], { type: "text/csv;charset=utf-8;" });
            var sUrl  = URL.createObjectURL(oBlob);
            var oLink = document.createElement("a");
            oLink.href = sUrl;
            oLink.download = "AssetStatus_" + new Date().toISOString().slice(0,10) + ".csv";
            document.body.appendChild(oLink);
            oLink.click();
            document.body.removeChild(oLink);
            setTimeout(function () { URL.revokeObjectURL(sUrl); }, 1000);
            MessageToast.show("Export complete.");
        },

        // ===================================================================
        // ██████████  CAMERA SCAN  ██████████
        // Flow:
        //   1. Open camera dialog (HTML video element via sap.ui.core.HTML)
        //   2. getUserMedia({ video: { facingMode: "environment" } })
        //   3a. BarcodeDetector available  → detect() every animation frame
        //   3b. BarcodeDetector NOT avail  → jsQR on canvas capture every frame
        //   4. On detected code → stop camera, close dialog, filter + navigate
        //   5. If permission denied / no device → show manual-input fallback dialog
        // ===================================================================

        onScanBarcode: function () {
            // Check basic camera support
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                MessageToast.show("Camera not supported in this browser.");
                this._openManualFallback();
                return;
            }
            this._openCameraDialog();
        },

        // ── 1. Build and open the camera dialog ─────────────────────────────

        _openCameraDialog: function () {
            var that = this;

            if (!this._oCameraDialog) {
                // We use sap.ui.core.HTML to embed the raw video/canvas/overlay markup
                var oHTML = new sap.ui.core.HTML({
                    content: [
                        '<div id="assetScanWrapper">',
                        '  <video id="assetScanVideo" autoplay playsinline muted></video>',
                        '  <canvas id="assetScanCanvas"></canvas>',
                        '  <div id="assetScanOverlay">',
                        '    <div id="assetScanFrame"></div>',
                        '    <span id="assetScanStatus">Iniciando cámara…</span>',
                        '  </div>',
                        '</div>'
                    ].join("")
                });

                this._oCameraDialog = new sap.m.Dialog({
                    title: "Scan Barcode / QR Code",
                    stretch: false,
                    contentWidth: "440px",
                    content: [ oHTML ],
                    endButton: new sap.m.Button({
                        text: "Cancel",
                        press: function () {
                            that._stopCamera();
                            that._oCameraDialog.close();
                        }
                    }),
                    afterClose: function () {
                        // Safety-net: always stop stream on close regardless of trigger
                        that._stopCamera();
                    }
                });
                this.getView().addDependent(this._oCameraDialog);
            }

            this._oCameraDialog.open();

            // Start camera once DOM is ready (short delay for dialog to render)
            setTimeout(function () { that._startCamera(); }, 350);
        },

        // ── 2. Request camera permission and start video stream ─────────────

        _startCamera: function () {
            var that = this;
            var oVideo = document.getElementById("assetScanVideo");
            if (!oVideo) { return; }

            navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode:  { ideal: "environment" }, // prefer back camera
                    width:       { ideal: 1280 },
                    height:      { ideal: 720  }
                },
                audio: false
            })
            .then(function (oStream) {
                _oStream = oStream;
                oVideo.srcObject = oStream;
                oVideo.play();
                _bScannerActive = true;
                that._updateScanStatus("Apunta la cámara al código…");

                // Choose decode strategy
                if (typeof BarcodeDetector !== "undefined") {
                    that._startBarcodeDetector(oVideo);
                } else if (typeof jsQR !== "undefined") {
                    that._startJsQR(oVideo);
                } else {
                    // Neither API available
                    that._updateScanStatus("Decodificación no disponible.");
                    that._stopCamera();
                    that._oCameraDialog.close();
                    MessageToast.show("Camera decoding not supported — use manual input.");
                    that._openManualFallback();
                }
            })
            .catch(function (oErr) {
                var sMsg = oErr.name === "NotAllowedError"
                    ? "Camera permission denied. Please allow camera access and try again."
                    : "Camera error: " + oErr.message;
                MessageToast.show(sMsg);
                that._oCameraDialog.close();
                that._openManualFallback();
            });
        },

        // ── 3a. BarcodeDetector strategy (Chrome / Android) ─────────────────

        _startBarcodeDetector: function (oVideo) {
            var that = this;
            var oDetector = new BarcodeDetector({
                formats: ["qr_code", "code_128", "code_39", "ean_13", "ean_8", "code_93"]
            });

            var fnScan = function () {
                if (!_bScannerActive) { return; }
                oDetector.detect(oVideo)
                    .then(function (aBarcodes) {
                        if (aBarcodes.length > 0) {
                            that._onCodeDetected(aBarcodes[0].rawValue);
                        } else {
                            _iAnimationFrame = requestAnimationFrame(fnScan);
                        }
                    })
                    .catch(function () {
                        // Ignore single-frame errors; keep scanning
                        _iAnimationFrame = requestAnimationFrame(fnScan);
                    });
            };

            _iAnimationFrame = requestAnimationFrame(fnScan);
        },

        // ── 3b. jsQR strategy (Firefox / Safari fallback) ───────────────────

        _startJsQR: function (oVideo) {
            var that = this;
            var oCanvas = document.getElementById("assetScanCanvas");
            var oCtx    = oCanvas ? oCanvas.getContext("2d") : null;
            if (!oCtx) { return; }

            var fnScan = function () {
                if (!_bScannerActive) { return; }
                var iW = oVideo.videoWidth;
                var iH = oVideo.videoHeight;
                if (!iW || !iH) {
                    // Video not ready yet — wait one more frame
                    _iAnimationFrame = requestAnimationFrame(fnScan);
                    return;
                }
                oCanvas.width  = iW;
                oCanvas.height = iH;
                oCtx.drawImage(oVideo, 0, 0, iW, iH);

                try {
                    var oImageData = oCtx.getImageData(0, 0, iW, iH);
                    var oCode      = jsQR(oImageData.data, iW, iH, {
                        inversionAttempts: "dontInvert"
                    });
                    if (oCode && oCode.data) {
                        that._onCodeDetected(oCode.data);
                    } else {
                        _iAnimationFrame = requestAnimationFrame(fnScan);
                    }
                } catch (e) {
                    _iAnimationFrame = requestAnimationFrame(fnScan);
                }
            };

            _iAnimationFrame = requestAnimationFrame(fnScan);
        },

        // ── 4. Code detected handler ─────────────────────────────────────────

        _onCodeDetected: function (sRawCode) {
            _bScannerActive = false;          // stop further scanning
            this._stopCamera();
            this._oCameraDialog.close();

            var sTag = sRawCode.trim();
            this._filterAndNavigateByTag(sTag);
        },

        // ── 5. Camera cleanup ────────────────────────────────────────────────

        _stopCamera: function () {
            _bScannerActive = false;
            if (_iAnimationFrame) {
                cancelAnimationFrame(_iAnimationFrame);
                _iAnimationFrame = null;
            }
            if (_oStream) {
                _oStream.getTracks().forEach(function (t) { t.stop(); });
                _oStream = null;
            }
            // Clear video srcObject to release the camera indicator light
            var oVideo = document.getElementById("assetScanVideo");
            if (oVideo) { oVideo.srcObject = null; }
        },

        _updateScanStatus: function (sText) {
            var oEl = document.getElementById("assetScanStatus");
            if (oEl) { oEl.textContent = sText; }
        },

        // ── 6. Manual-input fallback (when camera unavailable / denied) ──────

        _openManualFallback: function () {
            var that = this;

            if (!this._oManualInput) {
                this._oManualInput = new sap.m.Input({
                    placeholder: "e.g. 21000004-00",
                    width: "100%",
                    submit: function () { that._onManualConfirm(); }
                });
            }

            if (!this._oManualDialog) {
                this._oManualDialog = new sap.m.Dialog({
                    title: "Enter Asset Tag",
                    content: [
                        new sap.m.VBox({
                            items: [
                                new sap.m.Label({ text: "Asset Tag Number:", labelFor: this._oManualInput }),
                                this._oManualInput
                            ],
                            class: "sapUiSmallMargin"
                        })
                    ],
                    beginButton: new sap.m.Button({
                        text: "Confirm",
                        type: "Emphasized",
                        press: function () { that._onManualConfirm(); }
                    }),
                    endButton: new sap.m.Button({
                        text: "Cancel",
                        press: function () { that._oManualDialog.close(); }
                    }),
                    afterClose: function () { that._oManualInput.setValue(""); }
                });
                this.getView().addDependent(this._oManualDialog);
            }

            this._oManualDialog.open();
            setTimeout(function () { that._oManualInput.focus(); }, 300);
        },

        _onManualConfirm: function () {
            var sTag = this._oManualInput.getValue().trim();
            if (!sTag) { MessageToast.show("Please enter an Asset Tag."); return; }
            this._oManualDialog.close();
            this._filterAndNavigateByTag(sTag);
        },

        // ── Shared: filter list and navigate to matched asset ────────────────

        _filterAndNavigateByTag: function (sTag) {
            var oModel  = this.getView().getModel();
            var aAll    = oModel.getProperty("/Assets");
            var oFound  = null;

            for (var i = 0; i < aAll.length; i++) {
                if (aAll[i].Id === sTag) { oFound = aAll[i]; break; }
            }

            if (oFound) {
                // Filter list to show only this asset
                oModel.setProperty("/displayAssets", [oFound]);
                var oSF = this.byId("searchField");
                if (oSF) { oSF.setValue(sTag); }
                // Navigate to detail
                this.getOwnerComponent().getRouter().navTo("detail", {
                    objectId: encodeURIComponent(sTag)
                });
            } else {
                MessageToast.show("Asset not found: " + sTag);
            }
        },

        // ===================================================================
        // ██████████  QUICK STATUS UPDATE (per-row button)  ██████████
        // Opens a fragment dialog with one colored button per status code.
        // Pressing a button immediately applies the new status.
        // ===================================================================

        /**
         * Called by each row's "Change Status" button.
         * @param {sap.ui.base.Event} oEvent
         */
        onOpenStatusDialog: function (oEvent) {
            var oButton = oEvent.getSource();
            var oCtx    = oButton.getBindingContext();
            if (!oCtx) { return; }

            var oAsset  = oCtx.getObject();
            var oModel  = this.getView().getModel();

            // Store which asset we're updating
            oModel.setProperty("/pendingAsset", JSON.parse(JSON.stringify(oAsset)));

            var that = this;
            if (!this._oStatusDialogPromise) {
                this._oStatusDialogPromise = Fragment.load({
                    id:         this.getView().getId(),
                    name:       "com.aibel.assettracking.fragment.StatusUpdateDialog",
                    controller: this
                }).then(function (oDialog) {
                    that.getView().addDependent(oDialog);
                    return oDialog;
                });
            }

            this._oStatusDialogPromise.then(function (oDialog) {
                oDialog.open();
            });
        },

        /**
         * Fired when one of the status buttons inside the dialog is pressed.
         * The button's custom data "statusId" carries the new status code.
         */
        onApplyStatus: function (oEvent) {
            var sNewId  = oEvent.getSource().data("statusId");
            var oModel  = this.getView().getModel();
            var oPending = oModel.getProperty("/pendingAsset");
            if (!oPending) { return; }

            if (sNewId === oPending.StatusId) {
                MessageToast.show("This status is already active.");
                this._closeStatusDialog();
                return;
            }

            var oNewStatus = oStatusMap[sNewId];
            if (!oNewStatus) { return; }

            // Build today
            var oNow  = new Date();
            var pad   = function (n) { return String(n).padStart(2, "0"); };
            var sISO  = oNow.getFullYear() + "-" + pad(oNow.getMonth()+1) + "-" + pad(oNow.getDate());
            var sFmt  = pad(oNow.getDate()) + "." + pad(oNow.getMonth()+1) + "." + oNow.getFullYear();

            // Update both master arrays so the list refreshes immediately
            ["Assets", "displayAssets"].forEach(function (sProp) {
                var aArr = oModel.getProperty("/" + sProp);
                for (var i = 0; i < aArr.length; i++) {
                    if (aArr[i].Id === oPending.Id) {
                        aArr[i].StatusId                  = sNewId;
                        aArr[i].StatusText                = oNewStatus.text;
                        aArr[i].StatusState               = oNewStatus.state;
                        aArr[i].LastCountedDate           = sISO;
                        aArr[i].LastCountedDateFormatted  = sFmt;
                        aArr[i].UserUpdated               = "DEMO_USER";
                        break;
                    }
                }
                oModel.setProperty("/" + sProp, aArr);
            });

            oModel.setProperty("/pendingAsset", null);
            this._closeStatusDialog();
            // TODO: Replace with OData PATCH to ZASSET_STAT_TRAC
            MessageToast.show("Status → " + oNewStatus.text);
        },

        onCloseStatusDialog: function () {
            this._closeStatusDialog();
        },

        _closeStatusDialog: function () {
            if (this._oStatusDialogPromise) {
                this._oStatusDialogPromise.then(function (oDialog) { oDialog.close(); });
            }
        }

    });
});
