sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/Fragment",
    "sap/m/MessageToast"
], function (Controller, Fragment, MessageToast) {
    "use strict";

    /* -----------------------------------------------------------------------
       Status map  (mirrors ZASSET_STAT_CODE)
       TODO: Replace with OData ValueHelp entity read in production
    ----------------------------------------------------------------------- */
    var STATUS = {
        "00": { text: "ASSET OK",             state: "Success" },
        "01": { text: "DAMAGE",               state: "Error"   },
        "02": { text: "NOT MATCH COSTCENTER", state: "Warning" },
        "03": { text: "WRITE OFF",            state: "Warning" },
        "04": { text: "SOLD",                 state: "None"    }
    };

    /* ── Camera state (module-level, not on JSONModel) ──────────────────── */
    var _stream          = null;
    var _animFrame       = null;
    var _scanActive      = false;

    return Controller.extend("com.aibel.assettracking.controller.List", {

        /* ===================================================================
           Lifecycle
        =================================================================== */
        onInit: function () {
            this.getOwnerComponent().getRouter()
                .getRoute("list")
                .attachPatternMatched(this._onRouteMatched, this);
        },

        onExit: function () {
            this._stopCamera();
        },

        _onRouteMatched: function () {
            // Refresh table title count
            this._updateTitle();
        },

        _updateTitle: function () {
            var oModel = this.getView().getModel();
            if (!oModel) { return; }
            var n = (oModel.getProperty("/displayAssets") || []).length;
            oModel.setProperty("/tableTitle", "Assets (" + n + ")");
        },

        /* ===================================================================
           Filter Bar  — "Go" button
        =================================================================== */
        onSearch: function () {
            var oModel   = this.getView().getModel();
            var oFilters = oModel.getProperty("/filters") || {};
            var aAll     = oModel.getProperty("/Assets");

            var sTag    = (oFilters.assetTag    || "").trim().toUpperCase();
            var sBuk    = (oFilters.companyCode || "").trim();
            var sAsset  = (oFilters.assetNo     || "").trim();
            var sSub    = (oFilters.subNumber   || "").trim();
            var sStat   = (oFilters.statusCode  || "").trim();
            var sSearch = (oFilters.search      || "").trim().toLowerCase();

            var aResult = aAll.filter(function (o) {
                if (sTag    && o.Id.toUpperCase().indexOf(sTag) === -1)                { return false; }
                if (sBuk    && o.CompanyCode.indexOf(sBuk) === -1)                    { return false; }
                if (sAsset  && o.MainAssetNumber.indexOf(sAsset) === -1)               { return false; }
                if (sSub    && o.SubNumber.indexOf(sSub) === -1)                       { return false; }
                if (sStat   && o.StatusId !== sStat)                                   { return false; }
                if (sSearch && (
                    o.Id.toLowerCase().indexOf(sSearch) === -1 &&
                    o.Description.toLowerCase().indexOf(sSearch) === -1 &&
                    o.CostCenter.toLowerCase().indexOf(sSearch) === -1
                )) { return false; }
                return true;
            });

            oModel.setProperty("/displayAssets", aResult);
            this._updateTitle();
        },

        onClearFilters: function () {
            var oModel = this.getView().getModel();
            oModel.setProperty("/filters", {
                search: "", editingStatus: "ALL", assetTag: "",
                companyCode: "", assetNo: "", subNumber: "",
                statusCode: "", creationDateFrom: "", creationDateTo: ""
            });
            var aAll = oModel.getProperty("/Assets");
            oModel.setProperty("/displayAssets", JSON.parse(JSON.stringify(aAll)));
            this._updateTitle();
        },

        onRefresh: function () {
            this.onClearFilters();
            MessageToast.show("List refreshed.");
        },

        /* ===================================================================
           Row press → navigate to Object Page
        =================================================================== */
        onItemPress: function (oEvent) {
            var oCtx   = oEvent.getParameter("listItem").getBindingContext();
            if (!oCtx) { return; }
            this.getOwnerComponent().getRouter().navTo("detail", {
                objectId: encodeURIComponent(oCtx.getObject().Id)
            });
        },

        /* ===================================================================
           Table selection helpers
        =================================================================== */
        _getSelectedAssets: function () {
            var oTable = this.byId("assetTable");
            if (!oTable) { return []; }
            return oTable.getSelectedItems().map(function (oItem) {
                return oItem.getBindingContext().getObject();
            });
        },

        /* ===================================================================
           Status action buttons  (toolbar — act on selected rows)
           Each button calls _applyStatusToSelection with the target status code.
        =================================================================== */
        onNotMatchCC:   function () { this._applyStatusToSelection("02"); },
        onFlagDamage:   function () { this._applyStatusToSelection("01"); },
        onProposeWriteOff: function () { this._applyStatusToSelection("03"); },
        onFlagSold:     function () { this._applyStatusToSelection("04"); },
        onResetNormal:  function () { this._applyStatusToSelection("00"); },

        /**
         * Applies a new StatusId to every selected row.
         * Updates displayAssets AND Assets master array so both stay in sync.
         * TODO: Replace body with OData batch PATCH to ZASSET_STAT_TRAC.
         *
         * @param {string} sNewId - e.g. "01"
         */
        _applyStatusToSelection: function (sNewId) {
            var aSelected = this._getSelectedAssets();
            if (!aSelected.length) {
                MessageToast.show("Please select at least one asset.");
                return;
            }

            var oNewStatus = STATUS[sNewId];
            if (!oNewStatus) { return; }

            var oNow  = new Date();
            var pad   = function (n) { return String(n).padStart(2, "0"); };
            var sISO  = oNow.getFullYear() + "-" + pad(oNow.getMonth()+1) + "-" + pad(oNow.getDate());
            var _months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
            var sFiori = _months[oNow.getMonth()] + " " + oNow.getDate() + ", " + oNow.getFullYear();
            var sDot   = pad(oNow.getDate()) + "." + pad(oNow.getMonth()+1) + "." + oNow.getFullYear();

            var oIds = {};
            aSelected.forEach(function (o) { oIds[o.Id] = true; });

            var nUpdated = 0;
            var oModel   = this.getView().getModel();

            ["Assets", "displayAssets"].forEach(function (sProp) {
                var aArr = oModel.getProperty("/" + sProp);
                aArr.forEach(function (o) {
                    if (!oIds[o.Id]) { return; }
                    if (o.StatusId === sNewId) { return; } // skip if already set
                    o.StatusId                  = sNewId;
                    o.StatusText                = oNewStatus.text;
                    o.StatusState               = oNewStatus.state;
                    o.LastCountedDate           = sISO;
                    o.LastCountedDateFmt        = sFiori;
                    o.LastCountedDateFormatted  = sDot;
                    o.UserUpdated               = "DEMO_USER";
                    if (sProp === "Assets") { nUpdated++; }
                });
                oModel.setProperty("/" + sProp, aArr);
            });

            // Deselect all rows
            var oTable = this.byId("assetTable");
            if (oTable) { oTable.removeSelections(true); }

            if (nUpdated === 0) {
                MessageToast.show("All selected assets already have this status.");
            } else {
                MessageToast.show(nUpdated + " asset(s) → " + oNewStatus.text);
            }
        },

        /* ===================================================================
           Export / Download Template
        =================================================================== */
        onExport: function () {
            var aData = this.getView().getModel().getProperty("/displayAssets");
            if (!aData || !aData.length) { MessageToast.show("No data to export."); return; }
            var esc = function (v) {
                return '"' + String(v == null ? "" : v).replace(/"/g, '""') + '"';
            };
            var headers = ["Asset Tag","Company Code","Asset","Sub-number","Asset Status",
                           "Creation Date","Description","Changed Date","Serial No.","Inventory No.","User Updated"];
            var rows = aData.map(function (o) {
                return [esc(o.Id), esc(o.CompanyCode), esc(o.MainAssetNumber), esc(o.SubNumber),
                        esc(o.StatusText), esc(o.CreationDateFmt), esc(o.Description),
                        esc(o.LastCountedDateFmt), esc(o.SerialNumber), esc(o.InventoryNo),
                        esc(o.UserUpdated)].join(",");
            });
            var sCSV  = "\uFEFF" + headers.join(",") + "\n" + rows.join("\n");
            var oBlob = new Blob([sCSV], { type: "text/csv;charset=utf-8;" });
            var sUrl  = URL.createObjectURL(oBlob);
            var a     = document.createElement("a");
            a.href = sUrl;
            a.download = "AssetTracker_" + new Date().toISOString().slice(0,10) + ".csv";
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(function () { URL.revokeObjectURL(sUrl); }, 1000);
            MessageToast.show("Export complete.");
        },

        /* ===================================================================
           ██████████  CAMERA SCAN  ██████████
           Fix: jsQR is loaded DYNAMICALLY right before opening the camera,
           so we never hit a "not loaded yet" race condition.

           Strategy priority:
             1. BarcodeDetector (Chrome / Android Zebra TC56/TC57) — native, fastest
             2. jsQR via canvas — universal fallback (Firefox, Safari, older Android)
             3. Manual text input — if camera permission denied or no camera
        =================================================================== */

        onScanBarcode: function () {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                MessageToast.show("Camera not supported in this browser.");
                this._openManualInput();
                return;
            }
            // Load jsQR dynamically FIRST, then open camera
            // (avoids race condition where script tag wasn't loaded yet)
            this._loadJsQR(function (bLoaded) {
                // Regardless of whether jsQR loaded, try camera
                // (BarcodeDetector doesn't need it)
                this._openCameraDialog();
            }.bind(this));
        },

        /* ── Dynamic jsQR loader ─────────────────────────────────────────── */
        _loadJsQR: function (fnCallback) {
            // Already available (loaded previously or was in page)
            if (typeof window.jsQR === "function") {
                fnCallback(true);
                return;
            }
            // Inject script tag dynamically
            var oScript    = document.createElement("script");
            oScript.src    = "https://cdnjs.cloudflare.com/ajax/libs/jsQR/1.4.0/jsQR.min.js";
            oScript.async  = true;
            oScript.onload = function () {
                fnCallback(true);
            };
            oScript.onerror = function () {
                // CDN failed — try unpkg mirror
                var oFallback    = document.createElement("script");
                oFallback.src    = "https://unpkg.com/jsqr@1.4.0/dist/jsQR.js";
                oFallback.async  = true;
                oFallback.onload = function () { fnCallback(true); };
                oFallback.onerror= function () { fnCallback(false); };
                document.head.appendChild(oFallback);
            };
            document.head.appendChild(oScript);
        },

        /* ── Camera dialog ───────────────────────────────────────────────── */
        _openCameraDialog: function () {
            var that = this;

            if (!this._oCameraDialog) {
                var oContent = new sap.ui.core.HTML({
                    content: [
                        '<div id="scanWrapper">',
                        '  <video id="scanVideo" autoplay playsinline muted></video>',
                        '  <canvas id="scanCanvas"></canvas>',
                        '  <div id="scanOverlay">',
                        '    <div id="scanFrame"></div>',
                        '    <div id="scanLine"></div>',
                        '    <span id="scanStatus">Starting camera…</span>',
                        '  </div>',
                        '</div>'
                    ].join("")
                });

                this._oCameraDialog = new sap.m.Dialog({
                    title: "Scan Barcode / QR Code",
                    contentWidth: "460px",
                    content: [ oContent ],
                    endButton: new sap.m.Button({
                        text: "Cancel",
                        press: function () {
                            that._stopCamera();
                            that._oCameraDialog.close();
                        }
                    }),
                    afterClose: function () {
                        that._stopCamera();
                    }
                });
                this.getView().addDependent(this._oCameraDialog);
            }

            this._oCameraDialog.open();
            // Small delay for dialog DOM to be ready before accessing video element
            setTimeout(function () { that._startCamera(); }, 400);
        },

        /* ── Request camera permission + start stream ────────────────────── */
        _startCamera: function () {
            var that   = this;
            var oVideo = document.getElementById("scanVideo");
            if (!oVideo) { return; }

            this._setScanStatus("Requesting camera permission…");

            navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: { ideal: "environment" },  // back camera preferred
                    width:      { ideal: 1280 },
                    height:     { ideal: 720 }
                },
                audio: false
            })
            .then(function (oStream) {
                _stream = oStream;
                oVideo.srcObject = oStream;
                oVideo.play();
                _scanActive = true;
                that._setScanStatus("Point camera at the code…");

                /* ── Choose decode strategy ──────────────────────────── */
                if (typeof window.BarcodeDetector !== "undefined") {
                    // Strategy 1: Native BarcodeDetector (Chrome 83+, Android)
                    that._setScanStatus("Using native scanner…");
                    that._runBarcodeDetector(oVideo);
                } else if (typeof window.jsQR === "function") {
                    // Strategy 2: jsQR canvas fallback
                    that._setScanStatus("Point camera at the code…");
                    that._runJsQR(oVideo);
                } else {
                    // jsQR didn't load — show error and fall through to manual
                    that._stopCamera();
                    that._oCameraDialog.close();
                    MessageToast.show("QR decoder unavailable. Check internet connection.");
                    that._openManualInput();
                }
            })
            .catch(function (oErr) {
                var sMsg = oErr.name === "NotAllowedError"
                    ? "Camera access denied. Please allow camera in browser settings."
                    : "Camera error: " + (oErr.message || oErr.name);
                that._stopCamera();
                that._oCameraDialog.close();
                MessageToast.show(sMsg);
                that._openManualInput();
            });
        },

        /* ── Strategy 1: Native BarcodeDetector ─────────────────────────── */
        _runBarcodeDetector: function (oVideo) {
            var that      = this;
            var oDetector = new window.BarcodeDetector({
                formats: ["qr_code", "code_128", "code_39", "ean_13", "ean_8", "code_93", "itf"]
            });

            var fnFrame = function () {
                if (!_scanActive) { return; }
                oDetector.detect(oVideo)
                    .then(function (aBarcodes) {
                        if (aBarcodes.length) {
                            that._onCodeDetected(aBarcodes[0].rawValue);
                        } else {
                            _animFrame = requestAnimationFrame(fnFrame);
                        }
                    })
                    .catch(function () {
                        _animFrame = requestAnimationFrame(fnFrame);
                    });
            };
            _animFrame = requestAnimationFrame(fnFrame);
        },

        /* ── Strategy 2: jsQR canvas scan ───────────────────────────────── */
        _runJsQR: function (oVideo) {
            var that    = this;
            var oCanvas = document.getElementById("scanCanvas");
            if (!oCanvas) { return; }
            var oCtx    = oCanvas.getContext("2d");

            var fnFrame = function () {
                if (!_scanActive) { return; }
                var iW = oVideo.videoWidth;
                var iH = oVideo.videoHeight;
                if (!iW || !iH) {
                    _animFrame = requestAnimationFrame(fnFrame);
                    return;
                }
                oCanvas.width  = iW;
                oCanvas.height = iH;
                oCtx.drawImage(oVideo, 0, 0, iW, iH);
                try {
                    var oImageData = oCtx.getImageData(0, 0, iW, iH);
                    var oCode = window.jsQR(oImageData.data, iW, iH, {
                        inversionAttempts: "dontInvert"
                    });
                    if (oCode && oCode.data) {
                        that._onCodeDetected(oCode.data);
                    } else {
                        _animFrame = requestAnimationFrame(fnFrame);
                    }
                } catch (e) {
                    _animFrame = requestAnimationFrame(fnFrame);
                }
            };
            _animFrame = requestAnimationFrame(fnFrame);
        },

        /* ── Code detected → filter list and navigate ────────────────────── */
        _onCodeDetected: function (sRaw) {
            _scanActive = false;
            this._stopCamera();
            this._oCameraDialog.close();
            this._filterAndNavigateByTag(sRaw.trim());
        },

        /* ── Stop stream cleanly ─────────────────────────────────────────── */
        _stopCamera: function () {
            _scanActive = false;
            if (_animFrame) { cancelAnimationFrame(_animFrame); _animFrame = null; }
            if (_stream)    { _stream.getTracks().forEach(function (t) { t.stop(); }); _stream = null; }
            var v = document.getElementById("scanVideo");
            if (v) { v.srcObject = null; }
        },

        _setScanStatus: function (s) {
            var el = document.getElementById("scanStatus");
            if (el) { el.textContent = s; }
        },

        /* ── Manual fallback dialog ──────────────────────────────────────── */
        _openManualInput: function () {
            var that = this;
            if (!this._oManualInput) {
                this._oManualInput = new sap.m.Input({
                    placeholder: "e.g. 21000004-00",
                    width: "100%",
                    submit: function () { that._confirmManual(); }
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
                        text: "Confirm", type: "Emphasized",
                        press: function () { that._confirmManual(); }
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

        _confirmManual: function () {
            var sTag = this._oManualInput.getValue().trim();
            if (!sTag) { MessageToast.show("Please enter an Asset Tag."); return; }
            this._oManualDialog.close();
            this._filterAndNavigateByTag(sTag);
        },

        /* ── Filter list + navigate to detail ───────────────────────────── */
        _filterAndNavigateByTag: function (sTag) {
            var oModel = this.getView().getModel();
            var aAll   = oModel.getProperty("/Assets");
            var oFound = null;
            for (var i = 0; i < aAll.length; i++) {
                if (aAll[i].Id === sTag) { oFound = aAll[i]; break; }
            }
            if (oFound) {
                oModel.setProperty("/displayAssets", [oFound]);
                this._updateTitle();
                this.getOwnerComponent().getRouter().navTo("detail", {
                    objectId: encodeURIComponent(sTag)
                });
            } else {
                MessageToast.show("Asset not found: " + sTag);
            }
        }

    });
});
