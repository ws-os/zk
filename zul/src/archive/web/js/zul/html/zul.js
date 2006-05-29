/* zul.js

{{IS_NOTE
	Purpose:
		Common utilities for zul.
	Description:
		
	History:
		Thu Jul 14 15:02:27     2005, Created by tomyeh@potix.com
}}IS_NOTE

Copyright (C) 2005 Potix Corporation. All Rights Reserved.

{{IS_RIGHT
	This program is distributed under GPL Version 2.0 in the hope that
	it will be useful, but WITHOUT ANY WARRANTY.
}}IS_RIGHT
*/
zk.load("zul.html.lang.mesg*");

function zul() {}

if (!zul._modalIds) {
	zul._modalIds = new Array();
}

/** Exetends zkau.js to process additional command.
 * Note: it shall return wehther this command is processed.
 * If false, the default process will continue.
 */
zkau.processExt = function (cmd, uuid, cmp, datanum, data1, data2) {
	if ("doModal" == cmd ) {
		zul.doModal(cmp);
		return true;
	} else if ("endModal" == cmd) {
		zul.endModal(uuid);
		return true;
	} else {
		return false;
	}
};

/** Makes a window in the center. */
zul._center = function (cmp, zIdx) {
	cmp.style.position = "absolute";
	cmp.style.top = "-10000px"; //avoid annoying effect
	cmp.style.display = "block"; //we need to calculate the size
	zk.center(cmp);
	cmp.style.display = "none"; //avoid Firefox to display it too early
	cmp.style.display = "block";
	cmp.style.zIndex = zIdx;
}

/** Makes the component as modal. */
zul.doModal = function (cmp) {
	//center component
	var nModals = zul._modalIds.length;
	var zIdx = 20000 + nModals * 2;
	zul._center(cmp, zIdx + 1);
		//show dialog first to have better response.
	cmp.setAttribute("mode", "modal");

	zkau.closeFloats();

	var maskId = cmp.id + ".mask";
	var mask = $(maskId);
	if (!mask) {
		//Note: a modal window might be a child of another
		var bMask = true;
		for (var j = 0; j < nModals; ++j) {
			var n = $(zul._modalIds[j]);
			if (n && zk.isAncestor(n, cmp)) {
				bMask = false;
				break;
			}
		}
		if (bMask) {
			document.body.insertAdjacentHTML(
				"afterbegin", '<div id="'+maskId+'" class="modal_mask"></div>');
			mask =  $(maskId);
			if (!mask) zk.debug(msgzul.FAILED_TO_CREATE_MASK);
		}
	}

	//position mask to be full window
	if (mask) {
		zul.positionMask(mask);
		mask.style.display = "block";
		mask.style.zIndex = zIdx;
		if (zkau.currentFocus) //store it
			mask.setAttribute("zk_prevfocus", zkau.currentFocus.id);
	}

	var caption = $(cmp.id + "!caption");
	if (caption && caption.style.cursor == "") caption.style.cursor = "pointer";

	zul._modalIds.push(cmp.id);
	if (nModals == 0) {
		Event.observe(window, "resize", zul.doMoveMask);
		Event.observe(window, "scroll", zul.doMoveMask);
	}

	zkau.enableMoveable(cmp, zkau.autoZIndex, zkau.onWndMove);
	zk.disableAll(cmp);
	zk.restoreDisabled(cmp); //there might be two or more modal dlgs
	zk.focusDownById(cmp.id);
};

/** Makes the modal component as normal. */
zul.endModal = function (uuid) {
	var caption = $(uuid + "!caption");
	if (caption && caption.style.cursor == "pointer") caption.style.cursor = "";

	var maskId = uuid + ".mask";
	var mask = $(maskId);
	var prevfocusId;
	if (mask) {
		prevfocusId = mask.getAttribute("zk_prevfocus");
		mask.parentNode.removeChild(mask);
	}

	zul._modalIds.remove(uuid);
	for (;;) {
		if (zul._modalIds.length == 0) {
			Event.stopObserving(window," resize", zul.doMoveMask);
			Event.stopObserving(window, "scroll", zul.doMoveMask);
			window.onscroll = null;
			zk.restoreDisabled();
			break;
		}

		var lastid = zul._modalIds[zul._modalIds.length - 1];
		var last = $(lastid);
		if (last) {
			zk.restoreDisabled(last);
			if (!prevfocusId) zk.focusDownById(lastid);
			break;
		}
	}

	var cmp = $(uuid);
	if (cmp) {
		zkau.disableMoveable(cmp);
		cmp.removeAttribute("mode");
	}

	if (prevfocusId) zk.focusById(prevfocusId);
};
/** Handles onsize to re-position mask. */
zul.doMoveMask = function (evt) {
	for (var j = zul._modalIds.length; --j >= 0;) {
		var mask = $(zul._modalIds[j] + ".mask");
		if (mask) {
			zul.positionMask(mask);
			return;
		}
	}
};
/** Position the mask window. */
zul.positionMask = function (mask) {
	mask.style.left = zk.innerX() + "px";
	mask.style.top = zk.innerY() + "px";
	mask.style.width = zk.innerWidth() + "px";
	mask.style.height = zk.innerHeight() + "px";
};

//For sortable header, e.g., Column and Listheader
function zulSHdr() {} //listheader
zulSHdr.init = function (cmp) {
	zulSHdr._show(cmp);
	Event.observe(cmp, "click", function (evt) {zulSHdr.onclick(evt, cmp);});
	Event.observe(cmp, "mouseover", function () {return zulSHdr.onover(cmp);});
	Event.observe(cmp, "mouseout", function () {return zulSHdr.onout(cmp);});
};
zulSHdr.onover = function (cmp) {
	if (zulSHdr._sortable(cmp)) {
		zk.backupStyle(cmp, "textDecoration");
		cmp.style.textDecoration = "underline";
		zk.backupStyle(cmp, "cursor");
		cmp.style.cursor = "pointer";

		zulSHdr._show(cmp, true);
	}
};
zulSHdr.onout = function (cmp) {
	zk.restoreStyle(cmp, "textDecoration");
	zk.restoreStyle(cmp, "cursor");
	zulSHdr._show(cmp);
};
zulSHdr.onclick = function (evt, cmp) {
	if (zulSHdr._sortable(cmp))
		zkau.send({uuid: cmp.id, cmd: "onSort", data: null}, 10);
};

/** Tests whether it is sortable.
 */
zulSHdr._sortable = function (cmp) {
	return cmp.getAttribute("zk_asc") || cmp.getAttribute("zk_dsc");
};
/** Shows the hint, ascending or descending image.
 */
zulSHdr._show = function (cmp, hint) {
	var img = $(cmp.id + "!hint");
	if (img) {
		var nm;
		switch (cmp.getAttribute("zk_sort")) {
		case "ascending": nm = "asc"; break;
		case "descending": nm = "dsc"; break;
		default:
			if (!hint) {
				img.style.display = "none";
				return;
			}
			nm = "hint";
		}
		img.src = zk.rename(img.src, nm);
		img.style.display = "";
	}
};
zulSHdr.setAttr = function (cmp, nm, val) {
	zkau.setAttr(cmp, nm, val);
	if (nm == "zk_sort") zulSHdr._show(cmp);
	return true;
};
