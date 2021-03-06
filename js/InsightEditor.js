"use strict";
/*

Copyright 2010-2013 Scott Fortmann-Roe. All rights reserved.

This file may distributed and/or modified under the
terms of the Insight Maker Public License (http://insightMaker.com/impl).

*/


Ext.onReady(function() {
	main();
});

if(require.config){
	require.config({
	    baseUrl: builder_path+"/resources"
	});
}

var defaultSolver = '{"enabled": false, "algorithm": "RK1", "timeStep": 1}';

Ext.form.customFields = {
	'code': Ext.extend(Ext.form.TriggerField, {
		enableKeyEvents: false,
		selectOnFocus: true
	}),
	'converter': Ext.extend(Ext.form.TriggerField, {
		enableKeyEvents: false,
		selectOnFocus: true,
		stripCharsRe: /[^0-9\;\,\. \-]/g
	}),
	'units': Ext.extend(Ext.form.TriggerField, {
		enableKeyEvents: false,
		selectOnFocus: true,
		stripCharsRe: /[^A-Za-z 0-9\.\/\(\)\*\^]/g
	}),
	'richText': Ext.extend(Ext.form.TriggerField, {
		enableKeyEvents: false,
		selectOnFocus: true
	}),
	'solver': Ext.extend(Ext.form.TriggerField, {
		enableKeyEvents: false,
		selectOnFocus: false,
		clicksToEdit: 9999
	})
};

//make html edit links target blank
Ext.override(Ext.form.HtmlEditor, {
	createLink: function() {
		var url = prompt(this.createLinkText, this.defaultLinkValue);

		if (url && url != 'http:/' + '/') {
			var txt = this.win.getSelection();
			if (txt == "") {
				txt = url;
			}
			txt = '<a href="' + url + '" target="_blank">' + txt + '</a>';

			if (Ext.isIE) {
				range = this.getDoc().selection.createRange();
				if (range) {
					range.pasteHTML(txt);
					this.syncValue();
					this.deferFocus();
				}
			} else {
				this.execCmd('InsertHTML', txt);
				this.deferFocus();
			}
		}
	}
});

function renderTimeBut(value)
   {
	   var id = Ext.id();
       
       Ext.Function.defer(function() {
           new Ext.Button({
               text: "Edit Time Settings",
			   height: 16,
			   padding:0,
			   margin:0,
			   margins: 0,
               handler : function(btn, e) {
		   		 var config = JSON.parse(getSelected()[0].getAttribute("Solver"))
		   		 config.cell = getSelected()[0];

		   		 showTimeSettings(config);
               
               }
           }).render(document.body, id);
       }, 15);
       return '<div id="' + id + '"></div>';
   }

window.addEventListener('message', callAPI, false);

function callAPI(e) {
	try {
		e.source.postMessage(eval(e.data), "*");
	} catch (err) {

	}
}

function isLocal() {
	return (document.location.hostname == "localhost") || (document.location.hostname == "insightmaker.dev");
}

mxGraph.prototype.stopEditing=function(a){if(this.cellEditor!==null){this.cellEditor.stopEditing(a)}}


var equationRenderer = function(eq) {
	var res = eq;
	if (/\\n/.test(res)) {
		var vals = res.match(/(.*?)\\n/);
		res = vals[1] + "...";
	}

	res = res.replace(/</g, "&lt;");
	res = res.replace(/>/g, "&gt;");
	res = res.replace(/\[(.*?)\]/g, "<font color='Green'>[$1]</font>");
	res = res.replace(/(&lt;&lt;.*?&gt;&gt;)/g, "<font color='Orange'>$1</font>");
	res = res.replace(/(«.*?»)/g, "<font color='Orange'>$1</font>");
	res = res.replace(/\b([\d\.e]+)\b/g, "<font color='DeepSkyBlue'>$1</font>");
	res = res.replace(/(\{.*?\})/g, "<font color='Orange'>$1</font>");

	return clean(res);
};


if (!isLocal()) {
	window.onerror = function(err, file, line) {
		if(! /removeChild/.test(err)){
			var msg = [err, file, line].join(' : ');
			_gaq.push(['_trackEvent', 'Errors', 'App', msg, null, true]);
			//alert("Javascript Error\n\n" + err + "\n\n(" + file + " " + line + ")\n\nIf this error persists, please contact us for support.");
			console.log(msg);
			
			return true;
		}
	}
}

try {
	mxUtils.alert = function(message) {
		Ext.example.msg("<table><tr><td valign='top'><img src='"+builder_path+"/images/stop.png' style='padding-right:.3em;' width=48px height=48px  /></td><td>" + message + "</td></tr></table>", '');
	};
} catch (err) {
	alert("Insight Maker failed to load all its resources. Check your network connection and try to reload Insight Maker.");
}


var GraphEditor = {};
var mainPanel;
var mxPanel;
var ribbonPanel;
var configPanel;
var sizeChanging;
var graph;
var sliders = [];
var settingCell;
var selectionChanged;
var primitiveBank = {};
var clipboardListener;
var undoHistory;

function main() {


	Ext.QuickTips.init();

	try {
		mxEvent.disableContextMenu(document.body);
	} catch (err) {
		return; // resources not loaded. error message should already have been shown.
	}
	mxConstants.DEFAULT_HOTSPOT = 0.3;
	mxConstants.LINE_HEIGHT = 1.15;

	//Change the settings for touch devices
	

	graph = new mxGraph();

	undoHistory = new mxUndoManager();
	
	var node = mxUtils.parseXml('<mxStylesheet> 	<add as="defaultVertex" extend="defaultVertex"> 		<add as="strokeColor" value="#666666"/> 		<add as="fontColor" value="#333333"/>  <add as="overflow" value=""/> 		<add as="fontSize" value="14"/> 		<add as="fontFamily" value="Comic Sans MS"/> 		<add as="strokeWidth" value="2"/> 	</add> 	<add as="defaultEdge" extend="defaultEdge"> 		<add as="labelBackgroundColor" value="white"/> 		<add as="rounded" value="1"/> 		<add as="fontSize" value="14"/> 		<add as="edgeStyle" value="elbowEdgeStyle"/> 		<add as="fontFamily" value="Comic Sans MS"/> 		<add as="strokeWidth" value="4"/> 	</add> 	<add as="stock" extend="defaultVertex"> 		<add as="fillColor" value="#A6D3F8"/> 	</add> 	<add as="state" extend="defaultVertex"> 		<add as="fillColor" value="#ffffff"/> 	</add> 	<add as="transition" extend="defaultEdge"> 		<add as="strokeColor" value="#000000"/> 		<add as="fontColor" value="#000000"/> 	</add> 	<add as="agents" extend="defaultVertex"> 		<add as="fillColor" value="#F0E68C"/> 		<add as="shape" value="cloud"/> 	</add> 	<add as="textArea" extend="defaultVertex"> 		<add as="strokeColor" value="none"/> 		<add as="fillColor" value="none"/> 		<add as="fontColor" value="black"/> 		<add as="fontSize" value="30"/> 		<add as="fontStyle" value="4"/> 	</add> 	<add as="text" extend="defaultVertex"> 		<add as="strokeColor" value="none"/> 		<add as="fillColor" value="none"/> 		<add as="fontColor" value="black"/> 		<add as="fontSize" value="30"/> 		<add as="fontStyle" value="4"/> 	</add> 	 	<add as="parameter" extend="defaultVertex"> 		<add as="shape" value="ellipse"/> 		<add as="perimeter" value="ellipsePerimeter"/> 		<add as="fillColor" value="#FDCDAC"/> 	</add> 	<add as="variable" extend="defaultVertex"> 		<add as="shape" value="ellipse"/> 		<add as="perimeter" value="ellipsePerimeter"/> 		<add as="fillColor" value="#FDCDAC"/> 	</add> 	<add as="action" extend="defaultVertex"> 		<add as="shape" value="ellipse"/> 		<add as="perimeter" value="ellipsePerimeter"/> 		<add as="fillColor" value="#FFFFFF"/> 	</add> 	<add as="converter" extend="defaultVertex"> 		<add as="shape" value="ellipse"/> 		<add as="perimeter" value="ellipsePerimeter"/> 		<add as="fillColor" value="#B3E2CD"/> 	</add> 	<add as="button" extend="defaultVertex"> 		<add as="rounded" value="1"/> 		<add as="glass" value="1"/> 		<add as="fillColor" value="#C0C0C0"/> 		<add as="fontColor" value="black"/> 		<add as="strokeWidth" value="3"/> 		<add as="fontFamily" value="Helvetica"/> 	</add> 	<add as="display" extend="defaultVertex"> 		<add as="shape" value="ellipse"/> 		<add as="fillColor" value="#FFFFFF"/> 		<add as="strokeColor" value="#FFFFFF"/> 		<add as="fontColor" value="#FFFFFF"/> 		<add as="opacity" value="0"/> 	</add> 	<add as="picture" extend="defaultVertex"> 		<add as="shape" value="image"/> 		<add as="verticalLabelPosition" value="bottom"/> 		<add as="verticalAlign" value="top"/> 	</add> 	 	<add as="entity" extend="defaultEdge"> 		<add as="strokeColor" value="#808080"/> 		<add as="fontColor" value="#808080"/> 		<add as="opacity" value="70"/> 		<add as="edgeStyle" value="straight"/> 		<add as="strokeWidth" value="2"/> 		<add as="dashed" value="1"/> 		<add as="noLabel" value="0"/> 	</add> 	<add as="flow" extend="defaultEdge"> 	</add> 	<add as="link" extend="defaultEdge"> 		<add as="strokeColor" value="#808080"/> 		<add as="fontColor" value="#808080"/> 		<add as="opacity" value="70"/> 		<add as="edgeStyle" value="straight"/> 		<add as="strokeWidth" value="2"/> 		<add as="dashed" value="1"/> 		<add as="noLabel" value="0"/> 	</add> 	 	<add as="line" extend="defaultVertex"> 		<add as="shape" value="line"/> 		<add as="strokeWidth" value="4"/> 		<add as="labelBackgroundColor" value="white"/> 		<add as="verticalAlign" value="top"/> 		<add as="spacingTop" value="8"/> 	</add> 	<add as="image" extend="defaultVertex"> 		<add as="shape" value="image"/> 		<add as="verticalLabelPosition" value="bottom"/> 		<add as="verticalAlign" value="top"/> 	</add> 	 	<add as="folder" extend="defaultVertex"> 		<add as="verticalAlign" value="top"/> 		<add as="dashed" value="1"/> 		<add as="fillColor" value="none"/> 		<add as="rounded" value="1"/> 	</add> </mxStylesheet> ');
	var dec = new mxCodec(node);
	dec.decode(node.documentElement, graph.getStylesheet());

	graph.alternateEdgeStyle = 'vertical';
	graph.connectableEdges = true;
	graph.disconnectOnMove = false;
	graph.edgeLabelsMovable = true;
	graph.enterStopsCellEditing = true;
	graph.allowLoops = false;
	


	if(viewConfig.allowEdits){
		mxVertexHandler.prototype.rotationEnabled = true;
	}
	// Enables managing of sizers
	mxVertexHandler.prototype.manageSizers = true;

	// Enables live preview
	mxVertexHandler.prototype.livePreview = true;


	// Larger tolerance and grid for real touch devices
	if (!(mxClient.IS_TOUCH || navigator.maxTouchPoints > 0 || navigator.msMaxTouchPoints > 0)){
		Ext.FocusManager.enable();
		Ext.FocusManager.keyNav.disable();
		Ext.FocusManager.shouldShowFocusFrame = function() {
			return false;
		};
	}else
	{
		mxShape.prototype.svgStrokeTolerance = 18;
		mxVertexHandler.prototype.tolerance = 12;
		mxEdgeHandler.prototype.tolerance = 12;
		mxGraph.prototype.tolerance = 12;
		mxConstants.DEFAULT_HOTSPOT = 0.5;
		mxConstants.HANDLE_SIZE = 16;
		mxConstants.LABEL_HANDLE_SIZE = 7;
		
		graph.addListener(mxEvent.TAP_AND_HOLD, function(sender, evt)
		{
			var me = evt.getProperty('event');
			var cell = evt.getProperty('cell');
			
			if (cell !== null && isValued(cell))
			{
				showEditor(cell)
			}else{
				showContextMenu(null, me);
			}
			
			// Blocks further processing of the event
			evt.consume();
		});
		
		mxPanningHandler.prototype.isPanningTrigger = function(me)
		{
			var evt = me.getEvent();
			
		 	return (me.getState() == null && !mxEvent.isMouseEvent(evt)) ||
		 		(mxEvent.isPopupTrigger(evt) && (me.getState() == null || mxEvent.isControlDown(evt) || mxEvent.isShiftDown(evt)));
		};

		// Don't clear selection if multiple cells selected
		var graphHandlerMouseDown = mxGraphHandler.prototype.mouseDown;
		mxGraphHandler.prototype.mouseDown = function(sender, me)
		{
			graphHandlerMouseDown.apply(this, arguments);

			if (this.graph.isCellSelected(me.getCell()) && this.graph.getSelectionCount() > 1)
			{
				this.delayedSelection = false;
			}
		};

		

		// Overrides double click handling to use the tolerance
		// FIXME: Double click on edges in iPad needs focus on textarea
		var graphDblClick = mxGraph.prototype.dblClick;
		mxGraph.prototype.dblClick = function(evt, cell)
		{
			if (cell == null)
			{
				var pt = mxUtils.convertPoint(this.container,
					mxEvent.getClientX(evt), mxEvent.getClientY(evt));
				cell = this.getCellAt(pt.x, pt.y);
			}

			graphDblClick.call(this, evt, cell);
		};

		// Rounded edge and vertex handles
		var touchHandle = new mxImage(builder_path+'/images/touch-handle.png', 16, 16);
		mxVertexHandler.prototype.handleImage = touchHandle;
		mxEdgeHandler.prototype.handleImage = touchHandle;
		mxOutline.prototype.sizerImage = touchHandle;
		
		// Pre-fetches touch handle
		new Image().src = touchHandle.src;

		// Adds connect icon to selected vertex
		var connectorSrc = builder_path+'/images/touch-connector.png';
		

		new Image().src = connectorSrc;

		var vertexHandlerInit = mxVertexHandler.prototype.init;
		mxVertexHandler.prototype.init = function()
		{
			// TODO: Use 4 sizers, move outside of shape
			//this.singleSizer = this.state.width < 30 && this.state.height < 30;
			vertexHandlerInit.apply(this, arguments);

			// Only show connector image on one cell and do not show on containers
			if (this.graph.connectionHandler.isEnabled() &&
				this.graph.isCellConnectable(this.state.cell) &&
				this.graph.getSelectionCount() == 1 &&
				graph.connectionHandler.isConnectableCell(this.state.cell)
			)
			{
				this.connectorImg = mxUtils.createImage(connectorSrc);
				this.connectorImg.style.cursor = 'pointer';
				this.connectorImg.style.width = '29px';
				this.connectorImg.style.height = '29px';
				this.connectorImg.style.position = 'absolute';
				
				if (!mxClient.IS_TOUCH)
				{
					this.connectorImg.setAttribute('title', mxResources.get('connect'));
					mxEvent.redirectMouseEvents(this.connectorImg, this.graph, this.state);
				}

				// Starts connecting on touch/mouse down
				mxEvent.addGestureListeners(this.connectorImg,
					mxUtils.bind(this, function(evt)
					{
						this.graph.popupMenuHandler.hideMenu();
						this.graph.stopEditing(false);
						
						var pt = mxUtils.convertPoint(this.graph.container,
								mxEvent.getClientX(evt), mxEvent.getClientY(evt));
						this.graph.connectionHandler.start(this.state, pt.x, pt.y);
						this.graph.isMouseDown = true;
						this.graph.isMouseTrigger = mxEvent.isMouseEvent(evt);
						mxEvent.consume(evt);
					})
				);

				this.graph.container.appendChild(this.connectorImg);
			}

			this.redrawHandles();
		};
		
		var vertexHandlerHideSizers = mxVertexHandler.prototype.hideSizers;
		mxVertexHandler.prototype.hideSizers = function()
		{
			vertexHandlerHideSizers.apply(this, arguments);
			
			if (this.connectorImg != null)
			{
				this.connectorImg.style.visibility = 'hidden';
			}
		};
		
		var vertexHandlerReset = mxVertexHandler.prototype.reset;
		mxVertexHandler.prototype.reset = function()
		{
			vertexHandlerReset.apply(this, arguments);
			
			if (this.connectorImg != null)
			{
				this.connectorImg.style.visibility = '';
			}
		};
		
		var vertexHandlerRedrawHandles = mxVertexHandler.prototype.redrawHandles;
		mxVertexHandler.prototype.redrawHandles = function()
		{
			vertexHandlerRedrawHandles.apply(this);

			if (this.state != null && this.connectorImg != null)
			{
				var pt = new mxPoint();
				var s = this.state;
				
				// Top right for single-sizer
				if (mxVertexHandler.prototype.singleSizer)
				{
					pt.x = s.x + s.width - this.connectorImg.offsetWidth / 2;
					pt.y = s.y - this.connectorImg.offsetHeight / 2;
				}
				else
				{
					pt.x = s.x + s.width + mxConstants.HANDLE_SIZE / 2 + 4 + this.connectorImg.offsetWidth / 2;
					pt.y = s.y + s.height / 2;
				}
				
				var alpha = mxUtils.toRadians(mxUtils.getValue(s.style, mxConstants.STYLE_ROTATION, 0));
				
				if (alpha != 0)
				{
					var cos = Math.cos(alpha);
					var sin = Math.sin(alpha);
					
					var ct = new mxPoint(s.getCenterX(), s.getCenterY());
					pt = mxUtils.getRotatedPoint(pt, cos, sin, ct);
				}
				
				this.connectorImg.style.left = (pt.x - this.connectorImg.offsetWidth / 2) + 'px';
				this.connectorImg.style.top = (pt.y - this.connectorImg.offsetHeight / 2) + 'px';
			}
		};
		
		var vertexHandlerDestroy = mxVertexHandler.prototype.destroy;
		mxVertexHandler.prototype.destroy = function(sender, me)
		{
			vertexHandlerDestroy.apply(this, arguments);

			if (this.connectorImg != null)
			{
				this.connectorImg.parentNode.removeChild(this.connectorImg);
				this.connectorImg = null;
			}
		};
		
	}
	
	mxEdgeHandler.prototype.addEnabled = true;
	mxEdgeHandler.prototype.removeEnabled = true;

	graph.isHtmlLabel = function(cell) {
		//return false;
		var isHTML = cell != null && cell.value != null && ( cell.value.nodeName != "Display");
		
		return isHTML;
	};
	graph.isWrapping = graph.isHtmlLabel;

	graph.isCellLocked = function(cell) {
		return (! viewConfig.allowEdits) || getOpacity(cell) === 0 ;
	}
	graph.allowButtonSelect = false;
	graph.isCellSelectable = function(cell) {
		return (cell.value.nodeName != "Setting" && cell.value.nodeName != "Display" && (graph.allowButtonSelect || cell.value.nodeName != "Button" && getOpacity(cell) !== 0));
	}
	graph.isCellEditable = function(cell) {
		if (! viewConfig.allowEdits) {
			return false;
		}
		return (cell.value.nodeName != "Display" && cell.value.nodeName != "Setting" && getOpacity(cell) !== 0 && cell.value.nodeName != "Ghost" && ( cell.value.nodeName != "Button" || graph.isCellSelected(cell)));
	}

	graph.getCursorForCell = function(cell) {
		if (cell.value.nodeName == "Button") {
			return "pointer";
		}
	}
	graph.convertValueToString = function(cell) {
		if (mxUtils.isNode(cell.value)) {
			if (cell.value.nodeName == "Link" && orig(cell).getAttribute("name") == "Link") {
				return "";
			} else {
				return clean(orig(cell).getAttribute("name"));
			}
		}
		return '';
	};

	var cellLabelChanged = graph.cellLabelChanged;
	graph.labelChanged = function(cell, newValue, evt) {
		if (validPrimitiveName(newValue, cell)) {

			var oldName = cell.getAttribute("name");
			
			graph.model.beginUpdate();
			var edit = new mxCellAttributeChange(cell, "name", newValue);
			graph.getModel().execute(edit);
			selectionChanged(false);
			propogateGhosts(cell);
			propogateName(cell, oldName);
			
			graph.model.endUpdate();
			return cell;
		}
	};

	var getEditingValue = graph.getEditingValue;
	graph.getEditingValue = function(cell) {
		if (mxUtils.isNode(cell.value)) {
			return cell.getAttribute('name');
		}
	};

	setupHoverIcons();

	var doc = mxUtils.createXmlDocument();

	primitiveBank.text = doc.createElement('Text');
	primitiveBank.text.setAttribute('name', getText('Text Area'));
	primitiveBank.text.setAttribute('LabelPosition', "Middle");

	primitiveBank.folder = doc.createElement('Folder');
	primitiveBank.folder.setAttribute('name', getText('New Folder'));
	primitiveBank.folder.setAttribute('Note', '');
	primitiveBank.folder.setAttribute('Type', 'None');
	primitiveBank.folder.setAttribute('Solver', defaultSolver);
	primitiveBank.folder.setAttribute('Image', 'None');
	primitiveBank.folder.setAttribute('FlipHorizontal', false);
	primitiveBank.folder.setAttribute('FlipVertical', false);
	primitiveBank.folder.setAttribute('LabelPosition', "Middle");
	primitiveBank.folder.setAttribute('AgentBase', "");

	primitiveBank.ghost = doc.createElement('Ghost');
	primitiveBank.ghost.setAttribute('Source', '');

	primitiveBank.picture = doc.createElement('Picture');
	primitiveBank.picture.setAttribute('name', '');
	primitiveBank.picture.setAttribute('Note', '');
	primitiveBank.picture.setAttribute('Image', 'Growth');
	primitiveBank.picture.setAttribute('FlipHorizontal', false);
	primitiveBank.picture.setAttribute('FlipVertical', false);
	primitiveBank.picture.setAttribute('LabelPosition', "Bottom");

	primitiveBank.display = doc.createElement('Display');
	primitiveBank.display.setAttribute('name', getText('Default Display'));
	primitiveBank.display.setAttribute('Note', '');
	primitiveBank.display.setAttribute('Type', 'Time Series');
	primitiveBank.display.setAttribute('xAxis', getText("Time")+' (%u)');
	primitiveBank.display.setAttribute('yAxis', '');
	primitiveBank.display.setAttribute('yAxis2', '');
	primitiveBank.display.setAttribute('showMarkers', false);
	primitiveBank.display.setAttribute('showLines', true);
	primitiveBank.display.setAttribute('showArea', false);
	primitiveBank.display.setAttribute('ThreeDimensional', false);
	primitiveBank.display.setAttribute('Primitives', '');
	primitiveBank.display.setAttribute('Primitives2', '');
	primitiveBank.display.setAttribute('AutoAddPrimitives', false);
	primitiveBank.display.setAttribute('ScatterplotOrder', 'X Primitive, Y Primitive');
	primitiveBank.display.setAttribute('Image', 'Display');
	primitiveBank.display.setAttribute('FlipHorizontal', false);
	primitiveBank.display.setAttribute('FlipVertical', false);
	primitiveBank.display.setAttribute('LabelPosition', "Bottom");
	primitiveBank.display.setAttribute('legendPosition', "Automatic");

	function setValuedProperties(cell) {
		cell.setAttribute('Units', "Unitless")
		cell.setAttribute('MaxConstraintUsed', false)
		cell.setAttribute('MinConstraintUsed', false)
		cell.setAttribute('MaxConstraint', '100');
		cell.setAttribute('MinConstraint', '0');
		cell.setAttribute('ShowSlider', false);
		cell.setAttribute('SliderMax', 100);
		cell.setAttribute('SliderMin', 0);
		cell.setAttribute('SliderStep', '');
	}

	primitiveBank.stock = doc.createElement('Stock');
	primitiveBank.stock.setAttribute('name', getText('New Stock'));
	primitiveBank.stock.setAttribute('Note', '');
	primitiveBank.stock.setAttribute('InitialValue', '0');
	primitiveBank.stock.setAttribute('StockMode', 'Store');
	primitiveBank.stock.setAttribute('Delay', '10');
	primitiveBank.stock.setAttribute('Volume', '100');
	primitiveBank.stock.setAttribute('NonNegative', false);
	setValuedProperties(primitiveBank.stock);
	primitiveBank.stock.setAttribute('Image', 'None');
	primitiveBank.stock.setAttribute('FlipHorizontal', false);
	primitiveBank.stock.setAttribute('FlipVertical', false);
	primitiveBank.stock.setAttribute('LabelPosition', "Middle");

	primitiveBank.state = doc.createElement('State');
	primitiveBank.state.setAttribute('name', getText('New State'));
	primitiveBank.state.setAttribute('Note', '');
	primitiveBank.state.setAttribute('Active', 'false');
	primitiveBank.state.setAttribute('Residency', '0');
	primitiveBank.state.setAttribute('Image', 'None');
	primitiveBank.state.setAttribute('FlipHorizontal', false);
	primitiveBank.state.setAttribute('FlipVertical', false);
	primitiveBank.state.setAttribute('LabelPosition', "Middle");

	primitiveBank.transition = doc.createElement('Transition');
	primitiveBank.transition.setAttribute('name', getText('Transition'));
	primitiveBank.transition.setAttribute('Note', '');
	primitiveBank.transition.setAttribute('Trigger', 'Timeout');
	primitiveBank.transition.setAttribute('Value', '1');
	primitiveBank.transition.setAttribute('Repeat', false);
	primitiveBank.transition.setAttribute('Recalculate', false);
	setValuedProperties(primitiveBank.transition);
	
	primitiveBank.action = doc.createElement('Action');
	primitiveBank.action.setAttribute('name', getText('New Action'));
	primitiveBank.action.setAttribute('Note', '');
	primitiveBank.action.setAttribute('Trigger', 'Probability');
	primitiveBank.action.setAttribute('Value', '0.5');
	primitiveBank.action.setAttribute('Repeat', true);
	primitiveBank.action.setAttribute('Recalculate', false);
	primitiveBank.action.setAttribute('Action', 'Self.Move({Rand(), Rand()})');

	primitiveBank.agents = doc.createElement('Agents');
	primitiveBank.agents.setAttribute('name', getText('New Agent Population'));
	primitiveBank.agents.setAttribute('Note', '');
	primitiveBank.agents.setAttribute('Size', 100);
	primitiveBank.agents.setAttribute('GeoWrap', false);
	primitiveBank.agents.setAttribute('GeoDimUnits', 'Unitless');
	primitiveBank.agents.setAttribute('GeoWidth', 200);
	primitiveBank.agents.setAttribute('GeoHeight', 100);
	primitiveBank.agents.setAttribute('Placement', "Random");
	primitiveBank.agents.setAttribute('PlacementFunction', "{Rand()*Width([Self]), Rand()*Height([Self])}");
	primitiveBank.agents.setAttribute('Network', "None");
	primitiveBank.agents.setAttribute('NetworkFunction', "RandBoolean(0.02)");
	primitiveBank.agents.setAttribute('Agent', '');
	primitiveBank.agents.setAttribute('Image', 'None');
	primitiveBank.agents.setAttribute('FlipHorizontal', false);
	primitiveBank.agents.setAttribute('FlipVertical', false);
	primitiveBank.agents.setAttribute('LabelPosition', "Middle");
	primitiveBank.agents.setAttribute('ShowSlider', false);
	primitiveBank.agents.setAttribute('SliderMax', 100);
	primitiveBank.agents.setAttribute('SliderMin', 0);
	primitiveBank.agents.setAttribute('SliderStep', 1);

	primitiveBank.variable = doc.createElement('Variable');
	primitiveBank.variable.setAttribute('name', getText('New Variable'));
	primitiveBank.variable.setAttribute('Note', '');
	primitiveBank.variable.setAttribute('Equation', '0');
	setValuedProperties(primitiveBank.variable);
	primitiveBank.variable.setAttribute('Image', 'None');
	primitiveBank.variable.setAttribute('FlipHorizontal', false);
	primitiveBank.variable.setAttribute('FlipVertical', false);
	primitiveBank.variable.setAttribute('LabelPosition', "Middle");

	primitiveBank.button = doc.createElement('Button');
	primitiveBank.button.setAttribute('name', getText('New Button'));
	primitiveBank.button.setAttribute('Note', '');
	primitiveBank.button.setAttribute('Function', 'showMessage("Button action triggered!\\n\\nIf you want to edit this Action, click on the button while holding down the Shift key on your keyboard.")');
	primitiveBank.button.setAttribute('Image', 'None');
	primitiveBank.button.setAttribute('FlipHorizontal', false);
	primitiveBank.button.setAttribute('FlipVertical', false);
	primitiveBank.button.setAttribute('LabelPosition', "Middle");

	primitiveBank.converter = doc.createElement('Converter');
	primitiveBank.converter.setAttribute('name', getText('New Converter'));
	primitiveBank.converter.setAttribute('Note', '');
	primitiveBank.converter.setAttribute('Source', 'Time');
	primitiveBank.converter.setAttribute('Data', '0,0; 1,1; 2,4; 3,9');
	primitiveBank.converter.setAttribute('Interpolation', 'Linear');
	setValuedProperties(primitiveBank.converter);
	primitiveBank.converter.setAttribute('Image', 'None');
	primitiveBank.converter.setAttribute('FlipHorizontal', false);
	primitiveBank.converter.setAttribute('FlipVertical', false);
	primitiveBank.converter.setAttribute('LabelPosition', "Middle");

	primitiveBank.flow = doc.createElement('Flow');
	primitiveBank.flow.setAttribute('name', getText('Flow'));
	primitiveBank.flow.setAttribute('Note', '');
	primitiveBank.flow.setAttribute('FlowRate', '0');
	primitiveBank.flow.setAttribute('OnlyPositive', true);
	primitiveBank.flow.setAttribute('TimeIndependent', false);
	setValuedProperties(primitiveBank.flow);

	primitiveBank.link = doc.createElement('Link');
	primitiveBank.link.setAttribute('name', getText('Link'));
	primitiveBank.link.setAttribute('Note', '');
	primitiveBank.link.setAttribute('BiDirectional', false);

	primitiveBank.setting = doc.createElement('Setting');
	primitiveBank.setting.setAttribute('Note', '');
	primitiveBank.setting.setAttribute('Version', '34');
	primitiveBank.setting.setAttribute('Throttle', '1');
	primitiveBank.setting.setAttribute('TimeLength', '100');
	primitiveBank.setting.setAttribute('TimeStart', '0');
	primitiveBank.setting.setAttribute('TimeStep', '1');
	primitiveBank.setting.setAttribute('TimeUnits', 'Years');
	primitiveBank.setting.setAttribute('Units', "");
	primitiveBank.setting.setAttribute("SolutionAlgorithm", "RK1");
	primitiveBank.setting.setAttribute("BackgroundColor", "white");
	primitiveBank.setting.setAttribute("Macros", "");
	primitiveBank.setting.setAttribute("SensitivityPrimitives", "");
	primitiveBank.setting.setAttribute("SensitivityRuns", 50);
	primitiveBank.setting.setAttribute("SensitivityBounds", "50, 80, 95, 100");
	primitiveBank.setting.setAttribute("SensitivityShowRuns", "false");
	primitiveBank.setting.setAttribute("StrictUnits", "true");

	
	mxPanel = Ext.create('Ext.Component', {
		border: false
	});
	
	
	mainPanel = Ext.create('Ext.Panel', {
		region: 'center',
		border: false,
		layout:"fit",
		items: [mxPanel]
	});
	
	mainPanel.on('resize', function() {
		graph.sizeDidChange();
	});

	configPanel = Ext.create('Ext.Panel', ConfigPanel());
	ribbonPanel = Ext.create('Ext.Panel', RibbonPanel(graph, mainPanel, configPanel));

	var viewport = new Ext.Viewport({
		layout: 'border',
		padding: (viewConfig.showTopLinks?'19 5 5 5':'5 5 5 5'),
		items: [ribbonPanel, {
		    xtype: 'toolbar',
			region: 'south',
		    dock: 'bottom',
			hidden: false,
			id: 'unfoldToolbar',layout:{align:"bottom"},
		    items: [
			{
				iconCls: 'units-add-icon',
	            text: getText('View Story'),
				scope: this,
				id: 'unfoldUnfoldBut',
	            handler: function(){
					if(is_editor && (! is_embed)){
						mxUtils.alert("Edits to the model will not be saved while you are viewing the story.")
					}
					revealUnfoldButtons(true);
					beginUnfolding();
	            }
			},
			{
				scale: "large",
				iconAlign: 'top',
				iconCls: 'reload-icon',
	            text: getText('Start Over'),
				scope: this,
				id: 'reloadUnfoldBut',
	            handler: function(){
					restartUnfolding();
	            }
			},{
				hidden: is_ebook,
				scale: "large",
				iconAlign: 'top',
				iconCls: 'cancel-icon',
	            text: getText('Exit Story'),
				scope: this,
				id: 'exitUnfoldBut',
	            handler: function(){
					revealUnfoldButtons(false);
					finishUnfolding();
	            }
			},
			{
				html: "",
				id: 'messageUnfoldBut',
				flex: 1,
				xtype: "box",
				style: {"font-size": "larger"},
				margin: '4 10 4 10', align:"middle", minHeight:32
			},
			{
				scale: "large",
				iconAlign: 'top',
				iconCls: 'next-icon',
	            text: getText('Step Forward'),
				scope: this,
				id: 'nextUnfoldBut',
	            handler: function(){
					doUnfoldStep()
	            }
			}
		]}]
	});

	var connectionChangeHandler = function(sender, evt) {
		var item = evt.getProperty("edge");
		if (item.value.nodeName == "Link") {
			linkBroken(item);
		}
	};
	graph.addListener(mxEvent.CELL_CONNECTED, connectionChangeHandler);
	
	graph.addListener(mxEvent.CELLS_FOLDED, function(graph, e){
		if(! e.properties.collapse){
			graph.orderCells(false, e.properties.cells);
		}
	});

	mainPanel.el.insertHtml("beforeBegin",  "<div id='mainGraph'  style='z-index:1000;position:absolute; width:100%;height:100%;display:none;'></div>");

	mxPanel.el.dom.style.overflow = 'auto';
	if (mxClient.IS_MAC && mxClient.IS_SF) {
		graph.addListener(mxEvent.SIZE, function(graph) {
			graph.container.style.overflow = 'auto';
		});
	}

	graph.model.styleForCellChanged = function(cell, style) {
		var x = mxGraphModel.prototype.styleForCellChanged(cell, style);
		propogateGhosts(cell);
		return x;
	}

	graph.model.addListener(mxEvent.CHANGED, function(graph) {
		setSaveEnabled(true);
	});

	graph.model.addListener(mxEvent.CHANGE, function(sender, evt) {
		var changes = evt.getProperty('changes');

		if ((changes.length < 10) && changes.animate) {
			mxEffects.animateChanges(graph, changes);
		}
	});

	graph.addListener(mxEvent.CELLS_REMOVED, function(sender, evt) {
		var cells = evt.getProperty('cells');
		for (var i = 0; i < cells.length; i++) {
			deletePrimitive(cells[i]);
			if (cells[i].value.nodeName == "Folder") {
				var children = childrenCells(cells[i]);
				if (children != null) {
					for (var j = 0; j < children.length; j++) {
						deletePrimitive(children[j]);
					}
				}
			}
		}
		selectionChanged(true);
	});

	graph.addListener(mxEvent.CLICK, function(sender, evt) {

		var cell = evt.getProperty('cell');
		var realEvt = evt.getProperty('event');
		if (!evt.isConsumed()) {
			var panel = ribbonPanelItems().getComponent('valued');

			if ((cell == null || cell.value.nodeName == "Folder") && nodeInsertSelected()) {
				var pt = graph.getPointForEvent(realEvt);
				var parent;
				var x0, y0;
				if (cell != null && cell.value.nodeName == "Folder") {
					parent = cell;
					x0 = cell.geometry.getPoint().x;

					y0 = cell.geometry.getPoint().y;
				} else {
					parent = graph.getDefaultParent();
					x0 = 0;
					y0 = 0;
				}

				var vertex;
				graph.getModel().beginUpdate();
				try {
					if (panel.getComponent('stock').pressed) {
						vertex = graph.insertVertex(parent, null, primitiveBank.stock.cloneNode(true), pt.x - 50 - x0, pt.y - 20 - y0, 100, 40, 'stock');
					} else if (panel.getComponent('variable').pressed) {
						vertex = graph.insertVertex(parent, null, primitiveBank.variable.cloneNode(true), pt.x - 50 - x0, pt.y - 25 - y0, 120, 50, "variable");
					} else if (panel.getComponent('text').pressed) {
						vertex = graph.insertVertex(parent, null, primitiveBank.text.cloneNode(true), pt.x - 100 - x0, pt.y - 25 - y0, 200, 50, "text");
					} else if (panel.getComponent('converter').pressed) {
						vertex = graph.insertVertex(parent, null, primitiveBank.converter.cloneNode(true), pt.x - 50 - x0, pt.y - 25 - y0, 120, 50, "converter");
						setConverterInit(vertex);
					} else if (panel.getComponent('buttonBut').pressed) {
						vertex = graph.insertVertex(parent, null, primitiveBank.button.cloneNode(true), pt.x - 50 - x0, pt.y - 25 - y0, 120, 40, "button");
					} else if (panel.getComponent('picture').pressed) {
						vertex = graph.insertVertex(parent, null, primitiveBank.picture.cloneNode(true), pt.x - 24 - x0, pt.y - 24 - y0, 64, 64, "picture");
						setPicture(vertex);
					}

					panel.getComponent('stock').toggle(false);
					panel.getComponent('variable').toggle(false);
					panel.getComponent('text').toggle(false);
					panel.getComponent('converter').toggle(false);
					panel.getComponent('picture').toggle(false);
					panel.getComponent('buttonBut').toggle(false);



					if (isValued(vertex) || (vertex.value.nodeName == "Agents")) {
						var displays = primitives("Display");
						for (var i = 0; i < displays.length; i++) {
							var d = displays[i];
							if (isTrue(d.getAttribute("AutoAddPrimitives")) && d.getAttribute("Type") != "Scatterplot" && (d.getAttribute("Type") != "Map" || vertex.value.nodeName == "Agents")) {
								var s = d.getAttribute("Primitives");
								if (typeof(s) == "undefined") {
									d.setAttribute("Primitives", vertex.id);
								} else {
									var items = s.split(",");
									items.push(vertex.id);
									d.setAttribute("Primitives", items.join(","));
								}
							}
						}
					}
				} finally {
					graph.setSelectionCell(vertex);
					graph.getModel().endUpdate();
					evt.consume();
					graph.cellEditor.startEditing(vertex);
				}
			} else if (cell == null) {
				graph.clearSelection();
			}
		}
	});


	// Initializes the graph as the DOM for the panel has now been created	
	graph.init(mxPanel.el.dom);
	graph.setConnectable(viewConfig.allowEdits);
	graph.setDropEnabled(true);
	graph.setSplitEnabled(false);
	graph.connectionHandler.connectImage = new mxImage(builder_path+'/images/connector.gif', 16, 16);
	graph.connectionHandler.isConnectableCell = function(cell){
		//console.log(cell);
		if(! cell){
			return false;
		}
		if(getOpacity(cell) === 0){
			return false;
		}
		var type = connectionType();
		if(cell.value.nodeName == "Link" || type == "None"){
			return false;
		}
		if(type == "Link"){
			return true;
		}else{
			var o = orig(cell);
            return o.value.nodeName == "Stock" || o.value.nodeName == "State";  
		}
	}
	graph.setPanning(true);
	graph.setTooltips(false);
	graph.connectionHandler.setCreateTarget(false);



	var rubberband = new mxRubberband(graph);

	var parent = graph.getDefaultParent();

	graph.popupMenuHandler.factoryMethod = function(menu, cell, evt){
		if (!evt.shiftKey) {
			if(viewConfig.enableContextMenu){
				showContextMenu(null, evt);
			}
		}
	};
			

	graph.model.addListener(mxEvent.CHANGED, clearPrimitiveCache);



	settingCell = graph.insertVertex(parent, null, primitiveBank.setting, 20, 20, 80, 40);
	settingCell.visible = false;
	var firstdisp = graph.insertVertex(parent, null, primitiveBank.display.cloneNode(true), 50, 20, 64, 64, "roundImage;image="+builder_path+"/images/DisplayFull.png;");
	firstdisp.visible = false;
	firstdisp.setAttribute("AutoAddPrimitives", true);
	firstdisp.setAttribute("name", getText("Default Display"));



	graph.getEdgeValidationError = function(edge, source, target) {
		if ((edge != null && (edge.value.nodeName == "Flow" || edge.value.nodeName == "Transition")) || (this.model.getValue(edge) == null && ribbonPanelItems().getComponent('connect').getComponent('flow').pressed)) {
			if (isDefined(source) && source !== null && source.isConnectable()) {
				if (!(source.value.nodeName == "Stock" || (source.value.nodeName == "Ghost" && orig(source).value.nodeName == "Stock") || source.value.nodeName == "State" || (source.value.nodeName == "Ghost" && orig(source).value.nodeName == "State"))) {
					return getText('You cannot make that connection.');
				}
			}
			if (isDefined(target) && target !== null && target.isConnectable()) {
				if (!(target.value.nodeName == "Stock" || (target.value.nodeName == "Ghost" && orig(target).value.nodeName == "Stock") || target.value.nodeName == "State" || (target.value.nodeName == "Ghost" && orig(target).value.nodeName == "State"))) {
					return getText('You cannot make that connection.');
				}
				if (isDefined(source) && source !== null && source.isConnectable()) {
					if (orig(source).value.nodeName != orig(target).value.nodeName) {
						return getText("You cannot connect stocks to transitions.");
					}
				}
			}
		}


		if ((edge != null && edge.value.nodeName == "Link") || (this.model.getValue(edge) == null && ribbonPanelItems().getComponent('connect').getComponent('link').pressed)) {
			if (isDefined(source) && source !== null) {
				if (source.value.nodeName == "Link") {
					return getText('Links cannot be connected to links.');
				}
			}
			if (isDefined(target) && target !== null) {
				if (target.value.nodeName == "Link") {
					return getText('Links cannot be connected to links.');
				}
			}
		}
		var x = mxGraph.prototype.getEdgeValidationError.apply(this, arguments);
		return x;
	};


/*	if (true && is_editor && drupal_node_ID != -1) {
 var sharer = new mxSession(graph.getModel(), "/builder/hub.php?init&id=" + drupal_node_ID, "/builder/hub.php?id=" + drupal_node_ID, "/builder/hub.php?id=" + drupal_node_ID);
        sharer.start();
        sharer.createUndoableEdit = function(changes)
        {
            var edit = mxSession.prototype.createUndoableEdit(changes);
            edit.changes.animate = true;
            return edit;
        }
	}*/

	if ((graph_source_data != null && graph_source_data.length > 0) || drupal_node_ID == -1) {
		var code;
		if (drupal_node_ID == -1) {
			code = blankGraphTemplate;
		} else {
			code = graph_source_data;
		}

		var doc = mxUtils.parseXml(code);
		var dec = new mxCodec(doc);
		dec.decode(doc.documentElement, graph.getModel());

		updateModel();
		

	}
	
	
	
	loadBackgroundColor();

	if (viewConfig.saveEnabled) {
		var mgr = new mxAutoSaveManager(graph);
		mgr.autoSaveThreshold = 0;
		mgr.save = function() {
			if (graph_title != "" && unfoldingManager.unfolding == false) {
				saveModel();
			}
		};
	}

	var listener = function(sender, evt) {
			undoHistory.undoableEditHappened(evt.getProperty('edit'));
		};

	graph.getModel().addListener(mxEvent.UNDO, listener);
	graph.getView().addListener(mxEvent.UNDO, listener);

	//Update folder displays between collapsed and full versions
	graph.addListener(mxEvent.CELLS_FOLDED, function(sender, evt) {
		var cells = evt.properties.cells;
		var collapse = evt.properties.collapse;
		for (var i = 0; i < cells.length; i++) {
			setPicture(cells[i]);
			setLabelPosition(cells[i]);
		}
	});

	var toolbarItems = ribbonPanelItems();
	var selectionListener = function() {
			var selected = !graph.isSelectionEmpty();
			var selectedNonGhost = selected && (graph.getSelectionCount() == 1 ? graph.getSelectionCell().value.nodeName != "Ghost" : true);

			toolbarItems.getComponent('valued').getComponent('folder').setDisabled(graph.getSelectionCount() <= 0);
			toolbarItems.getComponent('valued').getComponent('ghostBut').setDisabled(graph.getSelectionCount() != 1 || ((!isValued(graph.getSelectionCell()) && graph.getSelectionCell().value.nodeName != "Picture" && graph.getSelectionCell().value.nodeName != "Agents")) || graph.getSelectionCell().value.nodeName == "Flow" || graph.getSelectionCell().value.nodeName == "Transition" || graph.getSelectionCell().value.nodeName == "Ghost");

			toolbarItems.getComponent('actions').getComponent('cut').setDisabled(!selected);
			toolbarItems.getComponent('actions').getComponent('copy').setDisabled(!selected);
			toolbarItems.getComponent('actions').getComponent('delete').setDisabled(!selected);
			toolbarItems.getComponent('style').getComponent('fillcolor').setDisabled(!((!selected) || selectedNonGhost));
			toolbarItems.getComponent('style').getComponent('fontcolor').setDisabled(!selectedNonGhost);
			toolbarItems.getComponent('style').getComponent('linecolor').setDisabled(!selectedNonGhost);
			toolbarItems.getComponent('style').getComponent('bold').setDisabled(!selectedNonGhost);
			toolbarItems.getComponent('style').getComponent('italic').setDisabled(!selectedNonGhost);
			toolbarItems.getComponent('style').getComponent('underline').setDisabled(!selectedNonGhost);
			fontCombo.setDisabled(!selectedNonGhost);
			sizeCombo.setDisabled(!selectedNonGhost);
			toolbarItems.getComponent('style').getComponent('align').setDisabled(!selectedNonGhost);
			toolbarItems.getComponent('style').getComponent('movemenu').setDisabled(!selected);
			toolbarItems.getComponent('style').getComponent('picturemenu').setDisabled(!selected);
			toolbarItems.getComponent('connect').getComponent('reverse').setDisabled(!(selected && (cellsContainNodename(graph.getSelectionCells(), "Link") || cellsContainNodename(graph.getSelectionCells(), "Flow") || cellsContainNodename(graph.getSelectionCells(), "Transition"))));

			setStyles();
		};

	graph.getSelectionModel().addListener(mxEvent.CHANGED, selectionListener);



	clipboardListener = function() {
		toolbarItems.getComponent('actions').getComponent('paste').setDisabled(mxClipboard.isEmpty());
	};
	clipboardListener();


	// Updates the states of the undo/redo buttons in the toolbar
	var historyListener = function() {
			toolbarItems.getComponent('actions').getComponent('undo').setDisabled(!undoHistory.canUndo());
			toolbarItems.getComponent('actions').getComponent('redo').setDisabled(!undoHistory.canRedo());
		};

	undoHistory.addListener(mxEvent.ADD, historyListener);
	undoHistory.addListener(mxEvent.UNDO, historyListener);
	undoHistory.addListener(mxEvent.REDO, historyListener);

	// Updates the button states once
	selectionListener();
	historyListener();


	var previousCreateGroupCell = graph.createGroupCell;

	graph.createGroupCell = function() {
		var group = previousCreateGroupCell.apply(this, arguments);
		group.setStyle('folder');
		group.setValue(primitiveBank.folder.cloneNode(true));

		return group;
	};

	graph.connectionHandler.factoryMethod = function(source, target) {
		var style;
		var parent;
		var value;
		var conn;
		if (ribbonPanelItems().getComponent('connect').getComponent('link').pressed) {
			style = 'link';
			parent = primitiveBank.link.cloneNode(true);
		} else {
			if ((source != null && source.value.nodeName == "Stock") || (target != null && target.value.nodeName == "Stock")) {
				style = 'flow';
				parent = primitiveBank.flow.cloneNode(true);
			} else {
				style = 'transition';
				parent = primitiveBank.transition.cloneNode(true);
			}
		}
		var cell = new mxCell(parent, new mxGeometry(0, 0, 100, 100), style);
		cell.geometry.setTerminalPoint(new mxPoint(0, 100), true);
		cell.geometry.setTerminalPoint(new mxPoint(100, 0), false);
		cell.edge = true;
		cell.connectable = true;

		return cell;
	};

	graph.getTooltipForCell = function(cell) {
		if (cell != null && cell.value.getAttribute("Note") != null && cell.value.getAttribute("Note").length > 0) {
			return cell.value.getAttribute("Note");
		} else {
			return "";
		}
	}

	// Redirects tooltips to ExtJs tooltips. First a tooltip object
	// is created that will act as the tooltip for all cells.
	var tooltip = new Ext.ToolTip({
		html: '',
		hideDelay: 0,
		dismissDelay: 0,
		showDelay: 0
	});

	// Installs the tooltip by overriding the hooks in mxGraph to
	// show and hide the tooltip.
	graph.tooltipHandler.show = function(tip, x, y) {
		if (tip != null && tip.length > 0) {
			tooltip.update(tip);
			tooltip.showAt([x, y + mxConstants.TOOLTIP_VERTICAL_OFFSET]);
		} else {
			tooltip.hide();
		}
	};

	graph.tooltipHandler.hide = function() {
		tooltip.hide();
	};

	graph.tooltipHandler.hideTooltip = function() {
		tooltip.hide();
	};

	// Enables guides
	mxGraphHandler.prototype.guidesEnabled = true;

	mxGraphHandler.prototype.mouseDown = function(sender, me)
	{
		if (!me.isConsumed() && this.isEnabled() && this.graph.isEnabled() && me.getState() != null)
		{
			var cell = this.getInitialCellForEvent(me);
			
			if (cell !== null && cell.value.nodeName == "Button" && (!graph.getSelectionModel().isSelected(cell))) {
				
				if (me.evt.shiftKey == false) {
					pressButton(cell);
					me.consume();
					graph.allowButtonSelect = false;
					return false;
				}else{
					graph.allowButtonSelect = true;
				}
			}
			
			this.delayedSelection = this.isDelayedSelection(cell);
			this.cell = null;
		
			if (this.isSelectEnabled() && !this.delayedSelection)
			{
				this.graph.selectCellForEvent(cell, me.getEvent());
			}
		
			if (this.isMoveEnabled())
			{
				var model = this.graph.model;
				var geo = model.getGeometry(cell);

				if (this.graph.isCellMovable(cell) && ((!model.isEdge(cell) || this.graph.getSelectionCount() > 1 ||
					(geo.points != null && geo.points.length > 0) || model.getTerminal(cell, true) == null ||
					model.getTerminal(cell, false) == null) || this.graph.allowDanglingEdges || 
					(this.graph.isCloneEvent(me.getEvent()) && this.graph.isCellsCloneable())))
				{
					this.start(cell, me.getX(), me.getY());
				}
			
				this.cellWasClicked = true;
			
				// Workaround for SELECT element not working in Webkit, this blocks moving
				// of the cell if the select element is clicked in Safari which is needed
				// because Safari doesn't seem to route the subsequent mouseUp event via
				// this handler which leads to an inconsistent state (no reset called).
				// Same for cellWasClicked which will block clearing the selection when
				// clicking the background after clicking on the SELECT element in Safari.
				if ((!mxClient.IS_SF && !mxClient.IS_GC) || me.getSource().nodeName != 'SELECT')
				{
					me.consume();
				}
				else if (mxClient.IS_SF && me.getSource().nodeName == 'SELECT')
				{
					this.cellWasClicked = false;
					this.first = null;
				}
			}
		}
	};


	
		

	// Alt disables guides
	mxGuide.prototype.isEnabledForEvent = function(evt) {
		return !mxEvent.isAltDown(evt);
	};

	var undoHandler = function(sender, evt) {
			var changes = evt.getProperty('edit').changes;
			graph.setSelectionCells(graph.getSelectionCellsForChanges(changes));
		};

	undoHistory.addListener(mxEvent.UNDO, undoHandler);
	undoHistory.addListener(mxEvent.REDO, undoHandler);

	if(viewConfig.focusDiagram){
		//stealing focus in embedded frames scrolls the page to the frame
		graph.container.focus();
	}

	setTopLinks();
	if (!is_topBar) {
		toggleTopBar();
	}
	if (!is_sideBar) {
		configPanel.collapse(Ext.Component.DIRECTION_RIGHT, false);
	}

	

	mxKeyHandler.prototype.isGraphEvent = function(e) {
		
		if (e.altKey || e.shiftKey) {
			return false;
		}
		var w = Ext.WindowManager.getActive();
		if (isDefined(w) && w !== null && w.modal) {
			return false;
		}
		//console.log(Ext.FocusManager.focusedCmp);
		var x = isUndefined(Ext.FocusManager.focusedCmp) || Ext.FocusManager.focusedCmp.componentCls == 'x-container' || Ext.FocusManager.focusedCmp.componentCls == 'x-window' || Ext.FocusManager.focusedCmp.componentCls == 'x-panel' || Ext.FocusManager.focusedCmp.componentCls == 'x-panel-header' || Ext.FocusManager.focusedCmp.componentCls == 'x-window-header' || Ext.FocusManager.focusedCmp.componentCls == 'x-btn-group';
		//console.log(x);
		return x;
	}

	var keyHandler = new mxKeyHandler(graph);

	keyHandler.getFunction = function(evt) {
		if (evt != null) {
			return (mxEvent.isControlDown(evt) || (mxClient.IS_MAC && evt.metaKey)) ? this.controlKeys[evt.keyCode] : this.normalKeys[evt.keyCode];
		}

		return null;
	};

	keyHandler.bindKey(13, function() {
		graph.foldCells(false);
	});

	

	keyHandler.bindControlKey(65, function() {
		graph.selectAll();
	});

	//bold
	keyHandler.bindControlKey(66, function() {
		if (viewConfig.allowEdits) {
			graph.toggleCellStyleFlags(mxConstants.STYLE_FONTSTYLE, mxConstants.FONT_BOLD, excludeType(graph.getSelectionCells(), "Ghost"));
			setStyles();
		}
	});

	//italics
	keyHandler.bindControlKey(73, function() {
		if (viewConfig.allowEdits) {
			graph.toggleCellStyleFlags(mxConstants.STYLE_FONTSTYLE, mxConstants.FONT_ITALIC, excludeType(graph.getSelectionCells(), "Ghost"));
			setStyles();
		}
	});

	//underline
	keyHandler.bindControlKey(85, function() {
		if (viewConfig.allowEdits) {
			graph.toggleCellStyleFlags(mxConstants.STYLE_FONTSTYLE, mxConstants.FONT_UNDERLINE, excludeType(graph.getSelectionCells(), "Ghost"));
			setStyles();
		}
	});

	keyHandler.bindControlKey(89, function() {
		undoHistory.redo();
	});

	keyHandler.bindControlKey(90, function() {
		undoHistory.undo();
	});


	keyHandler.bindControlKey(67, function() {
		mxClipboard.copy(graph);
		clipboardListener();
	});

	keyHandler.bindControlKey(13, function() { // Return
		runModel();
	});

	keyHandler.bindControlKey(75, function() { // K
		scratchpadFn();
	});

	if(viewConfig.allowEdits){
		
		keyHandler.bindKey(8, function() {
				graph.removeCells(graph.getSelectionCells(), false);
		});

		keyHandler.bindKey(46, function() {
				graph.removeCells(graph.getSelectionCells(), false);
		});
		
		keyHandler.bindControlKey(88, function() {
			mxClipboard.cut(graph);
			clipboardListener();
		});
	
		keyHandler.bindControlKey(83, function() {
			saveModel();
		});

		keyHandler.bindControlKey(86, function() {
			mxClipboard.paste(graph);
			clipboardListener()
		});
		
		keyHandler.bindControlKey(192, function() { // `
			var primitive = graph.getSelectionCell();
			if (isDefined(primitive) && primitive != null) {
				var editorWindow = new Ext.RichTextWindow({
					parent: "",
					cell: primitive,
					html: getNote(primitive)
				});
				editorWindow.show();
			}
		});
	}
	
	keyHandler.bindControlKey(69, function() { // E
		doSensitivity();
	});
	
	keyHandler.bindControlKey(76, function() { // L
		timeSettingsFn();
	});
	
	keyHandler.bindControlKey(70, function() { // F
		showFindAndReplace();
	});
	
	keyHandler.bindControlKey(71, function() { // G
		var but = Ext.getCmp('findNextBut');
		if(but && (! but.disabled)){
			findNext();
		}
	});
	
	
	keyHandler.bindControlKey(80, function() { // P
		var pageCount = mxUtils.prompt(getText('Enter page count for printing')+":", '1');

		if (pageCount != null)
		{
		  var scale = mxUtils.getScaleForPageCount(pageCount, graph);
		  var preview = new mxPrintPreview(graph, scale);
		  preview.open();
		}
	});

	

	graph.getSelectionModel().addListener(mxEvent.CHANGE, function(sender, evt) {
		selectionChanged(false);
	});


	var primitiveRenderer = function(prims) {
			var items = prims.split(",");

			var myCells = primitives();
			if (myCells != null) {
				for (var i = 0; i < myCells.length; i++) {
					if (Ext.Array.indexOf(items, myCells[i].id) > -1) {
						items[Ext.Array.indexOf(items, myCells[i].id)] = myCells[i].getAttribute("name");
					}
				}
			}
			return items.join(", ");
		};

	var labelRenderer = function(eq) {
			var res = eq;

			res = res.replace(/(%.)/g, "<font color='DeepSkyBlue'>$1</font>");

			return clean(res);
		};

	


	selectionChanged = function(forceClear) {

		if (isDefined(grid)) {
			grid.plugins[0].completeEdit();
			configPanel.removeAll()
		}


		var cell = graph.getSelectionCell();
		if (forceClear) {
			cell = null;
		}

		var bottomItems = [];
		var topItems = [];
		var properties = [];
		var cellType;
		if (cell != null) {
			cellType = cell.value.nodeName;
		}

		if (cell != null && graph.getSelectionCells().length == 1 && (cellType != "Ghost")) {
			configPanel.setTitle(getText(cellType));


			properties = [{
				'name': 'Note',
				'text': getText('Note'),
				'value': cell.getAttribute("Note"),
				'group': '  '+getText('General'),
				'editor': new Ext.form.customFields['richText']({})
			}, {
				'name': 'name',
				'text': getText('(name)'),
				'value': cell.getAttribute("name"),
				'group': '  '+getText('General')
			}];

			if ((isValued(cell) || cell.value.nodeName == "Agents") && cell.value.nodeName != "State" && cell.value.nodeName != "Action") {
				if (viewConfig.allowEdits && cell.value.nodeName != "Converter") {
					properties.push({
						'name': 'ShowSlider',
						'text': getText('Show Value Slider'),
						'value': isTrue(cell.getAttribute("ShowSlider")),
						'group': getText('Slider')
					});

					properties.push({
						'name': 'SliderMax',
						'text': getText('Slider Max'),
						'value': parseFloat(cell.getAttribute("SliderMax")),
						'group': getText('Slider'),
						'editor': {
					        xtype: 'numberfield',
							allowDecimals: true,
							decimalPrecision: 9
						}
					});

					
					properties.push({
						'name': 'SliderMin',
						'text': getText('Slider Min'),
						'value': parseFloat(cell.getAttribute("SliderMin")),
						'group': getText('Slider'),
						'editor': {
					        xtype: 'numberfield',
							allowDecimals: true,
							decimalPrecision: 9
					    }
					});
					
					properties.push({
						'name': 'SliderStep',
						'text': getText('Slider Step'),
						'value': cell.getAttribute("SliderStep"),
						'group': getText('Slider'),
						'editor': {
					        xtype: 'numberfield',
					        minValue: 0,
							allowDecimals: true,
							decimalPrecision: 9
					    }
					});
				}

				if (cell.value.nodeName != "Transition" && cell.value.nodeName != "Agents") {
					properties.push({
						'name': 'Units',
						'text': getText('Units'),
						'value': cell.getAttribute("Units"),
						'group': getText('Validation'),
						'editor': new Ext.form.customFields['units']({})
					});
				}

				if (viewConfig.allowEdits && cell.value.nodeName != "Agents") {
					properties.push({
						'name': 'MaxConstraintUsed',
						'text': getText('Max Constraint'),
						'value': isTrue(cell.getAttribute("MaxConstraintUsed")),
						'group': getText('Validation')
					});

					properties.push({
						'name': 'MaxConstraint',
						'text': getText('Max Constraint'),
						'value': parseFloat(cell.getAttribute("MaxConstraint")),
						'group': getText('Validation'),
						'editor': {
					        xtype: 'numberfield',
							allowDecimals: true,
							decimalPrecision: 9
					    }
					});


					properties.push({
						'name': 'MinConstraintUsed',
						'text': getText('Min Constraint'),
						'value': isTrue(cell.getAttribute("MinConstraintUsed")),
						'group': getText('Validation')
					});

					properties.push({
						'name': 'MinConstraint',
						'text': getText('Min Constraint'),
						'value': parseFloat(cell.getAttribute("MinConstraint")),
						'group': getText('Validation'),
						'editor': {
					        xtype: 'numberfield',
							allowDecimals: true,
							decimalPrecision: 9
					    }
					});
				}
			}

		} else {
			configPanel.setTitle("");
		}

		function descriptionLink(url, subject){
			return "<a href='"+url+"' class='description_link' target='_blank'>Learn more about "+subject+" &rsaquo;</a><div style='clear:both'></div>"
		}
		
		var descBase = "<br/><img style='float:left; margin-right: 7px' src='"+builder_path+"/images/gui/help.png' width=32px height=32px />";

		var topDesc = "",
			bottomDesc = "";
		if (cell == null || graph.getSelectionCells().length > 1) {
			var slids = sliderPrimitives();

			//no primitive has been selected. Stick in empty text and sliders.
			if (drupal_node_ID == -1 && slids.length == 0) {
				if(is_ebook){
					topDesc = "<center><big>Select a primitive to see its properties.</big></center>";
				}else{
					topDesc = "<center><a href='http://www.youtube.com/watch?v=uH5zM7J-eHU' target='_blank'><img src='"+builder_path+"/images/Help.jpg' width=217 height=164 /><br><big>Watch this short video &rsaquo; </big></a><br/><br/><br/>Or take a look at the <a href='http://InsightMaker.com/help' target='_blank'>Detailed Insight Maker Manual</a><br/><br/>There is also a <a href='http://www.systemswiki.org/index.php?title=Modeling_%26_Simulation_with_Insight_Maker' target='_blank'>free, on-line education course</a> which teaches you how to think in a systems manner using Insight Maker.</center>";
				}
			} else {

				var topDesc = clean(graph_description);
				if (topDesc == "" && drupal_node_ID != -1) {
					if (viewConfig.saveEnabled) {
						topDesc = "<span style='color: #555'>"+getText("You haven't entered a description for this Insight yet. Please enter one to help others understand it.")+"</span>";
					}
				}
				
				
				if(topDesc != ""){
					topDesc = "<div class='sidebar_description'>" + topDesc + "</div>";
				}
				if (drupal_node_ID != -1 && cell == null) {
					topDesc = topDesc +' <div class="sidebar_share"> '+getText('Share')+' <span  id="st_facebook_button" displayText="Facebook"></span><span  id="st_twitter_button" displayText="Tweet"></span><span  id="st_linkedin_button" displayText="LinkedIn"></span><span  id="st_mail_button" displayText="EMail"></span></div>'+ (is_editor ? '<div class="sidebar_edit"><a href="#" onclick="updateProperties()">'+getText('Edit description')+'</a></div>' : '');
				}
				
				if(graph_tags.trim() != ""){
					var topTags = "";
					graph_tags.split(",").forEach(function(tag){
						var t = tag.trim();
						topTags = topTags+"<a target='_blank' href='/tag/"+clean(t.replace(/ /g, "-"))+"'>"+clean(t)+"</a> ";	
					});
					topDesc = topDesc + "<div class='sidebar_tags'>Tags: "+topTags+"</div>";
				}
				
				if((! is_editor) && graph_author_name != ""){
					topDesc = topDesc + "<div class='sidebar_author'>Insight Author: <a target='_blank' href='/user/"+clean(graph_author_id)+"'>"+clean(graph_author_name)+"</a></div>";
				}
				
				if (slids.length > 0) {
					bottomItems.push(createSliders(false, setValue, function(slider, setValue, textField, newValue){
						Ext.Msg.confirm("Change Value", "<p>The current value of the primitive is:</p><br/><p><pre>"+getValue(slider.sliderCell).replace(/\\n/g, "\n")+"</pre></p><br/><p>Are you sure you want to change this value using the slider?</p>", function(btn){
							if(btn == 'yes'){
								setValue(slider.sliderCell, parseFloat(newValue));
							}else{
								textField.setRawValue("");
								slider.setValue(undefined);
							}
							slider.confirming = false;
			
						});
					}));
					bottomItems.push({xtype: "component", html: "<br/><br/>"});
				}

			}

		} else if (cellType == "Stock") {


			bottomDesc = descBase + 'A stock stores a material or a resource. Lakes and Bank Accounts are both examples of stocks. One stores water while the other stores money. The Initial Value defines how much material is initially in the Stock. '+descriptionLink("/stocks", "Stocks");
			properties.push({
				'name': 'InitialValue',
				'text': getText('Initial Value')+' =',
				'value': cell.getAttribute("InitialValue"),
				'group': ' '+getText('Configuration'),
				'editor': new Ext.form.customFields['code']({}),
				'renderer': equationRenderer
			});

			properties.push({
				'name': 'AllowNegatives',
				'text': getText('Allow Negatives'),
				'value': !isTrue(cell.getAttribute("NonNegative")),
				'group': ' '+getText('Configuration')
			});

			properties.push({
				'name': 'StockMode',
				'text': getText('Stock Type'),
				'value': cell.getAttribute("StockMode"),
				'group': getText('Behavior'),
				'editor': new Ext.form.ComboBox({
					triggerAction: "all",
					store: [['Store', getText("Store")], ['Conveyor', getText("Conveyor")]],
					selectOnFocus: true
				})
			});
			properties.push({
				'name': 'Delay',
				'text': getText('Delay'),
				'value': isDefined(cell.getAttribute("Delay"))?cell.getAttribute("Delay").toString():"",
				'group': getText('Behavior'),
				'renderer': equationRenderer
			});

		} else if (cellType == "Variable") {
			bottomDesc = descBase + "A variable is a dynamically updated object in your model that synthesizes available data or provides a constant value for use in your equations. The birth rate of a population or the maximum volume of water in a lake are both possible uses of variables." +descriptionLink("/variables", "Variables");
			properties.push({
				'name': 'Equation',
				'text': getText('Value/Equation')+' =',
				'value': cell.getAttribute("Equation"),
				'group': ' '+getText('Configuration'),
				'editor': new Ext.form.customFields['code']({}),
				'renderer': equationRenderer
			});
		} else if (cell.value.nodeName == "Link") {
			bottomDesc = descBase + "Links connect the different parts of your model. If one primitive in your model refers to another in its equation, the two primitives must either be directly connected or connected through a link. Once connected with links, square-brackets may be used to reference values of other primitives. So if you have a stock called <i>Bank Balance</i>, you could refer to it in another primitive's equation with <i>[Bank Balance]</i>."+descriptionLink("/links", "Links");
			properties.push({
				'name': 'BiDirectional',
				'text': getText('Bi-Directional'),
				'value': isTrue(cell.getAttribute("BiDirectional")),
				'group': ' '+getText('Configuration')
			});

		} else if (cell.value.nodeName == "Folder") {
			bottomDesc = descBase + "Folders group together similar items in a logical way. You can collapse and expand folders to hide or reveal model complexity.";
			properties.push({
				'name': 'Type',
				'text': getText('Behavior'),
				'value': cell.getAttribute("Type"),
				'group': ' '+getText('Configuration'),
				'editor': new Ext.form.ComboBox({
					triggerAction: "all",
					store: [['None', getText('None')], ['Agent', getText('Agent')]],
					editable: false,
					selectOnFocus: true
				})
			});
			properties.push({
				'name': 'Solver',
				'text': getText('Time Settings'),
				'value': cell.getAttribute("Equation"),
				'group': ' '+getText('Configuration'),
				'renderer': renderTimeBut
			});
			
			properties.push({
				'name': 'AgentBase',
				'text': getText('Agent Parent'),
				'value': cell.getAttribute("AgentBase"),
				'group': ' '+getText('Configuration'),
				'editor': new Ext.form.customFields['code']({}),
				'renderer': equationRenderer
			});
		    
		       
		} else if (cell.value.nodeName == "Button") {
			bottomDesc = descBase + "Buttons are used for interactivity. To select a button without triggering its action, hold down the Shift key when you click the button. Buttons are currently in Beta and their implementation may change in later versions of Insight Maker. Available button API commands are <a href='http://insightmaker.com/sites/default/files/API/' target='_blank'>available here</a>."+descriptionLink("/scripting", "Model Scripting");
			
			properties.push({
				'name': 'Function',
				'text': getText('Action'),
				'value': cell.getAttribute("Function"),
				'group': ' '+getText('Configuration'),
				'editor': new Ext.form.TextArea({
					grow: true,
					growMax: 80
				})
			});
			//add padding so action field does go outside the grid and get hidden
			properties.push({
				'name': 'xx',
				'text': ' ',
				'value': "",
				'group': ' '+getText('Configuration'),
				'editor': new Ext.form.TextArea({
					grow: true,
					growMax: 80,
					style: 'display:none'
				})
			});
			properties.push({
				'name': 'xy',
				'text': ' ',
				'value': "",
				'group': ' '+getText('Configuration'),
				'editor': new Ext.form.TextArea({
					grow: true,
					growMax: 80,
					style: 'display:none'
				})
			});

		} else if (cell.value.nodeName == "Flow") {
			bottomDesc = descBase + "Flows represent the transfer of material from one stock to another. For example given the case of a lake, the flows for the lake might be: River Inflow, River Outflow, Precipitation, and Evaporation. Flows are given a flow rate and they operator over one unit of time; in effect: flow per one second or per one minute." +descriptionLink("/flows", "Flows");
			properties.push({
				'name': 'FlowRate',
				'text': getText('Flow Rate')+' =',
				'value': cell.getAttribute("FlowRate"),
				'group': ' '+getText('Configuration'),
				'editor': new Ext.form.customFields['code']({}),
				'renderer': equationRenderer
			});
			properties.push({
				'name': 'OnlyPositive',
				'text': getText('Only Positive Rates'),
				'value': isTrue(cell.getAttribute("OnlyPositive")),
				'group': ' '+getText('Configuration')
			});

		} else if (cell.value.nodeName == "Transition") {
			bottomDesc = descBase + "Transitions move agents between states. You can have transitions trigger based on some condition, a probability, or a timeout."+descriptionLink("/transitions", "Transitions");
			properties.push({
				'name': 'Trigger',
				'text': getText('Triggered by'),
				'value': cell.getAttribute("Trigger"),
				'group': ' '+getText('Configuration'),
				'editor': new Ext.form.ComboBox({
					triggerAction: "all",
					store: ['Timeout', 'Probability', 'Condition'],
					editable: false,
					selectOnFocus: true
				})
			});
			properties.push({
				'name': 'Value',
				'text': getText('Value')+' =',
				'value': cell.getAttribute("Value"),
				'group': ' '+getText('Configuration'),
				'editor': new Ext.form.customFields['code']({}),
				'renderer': equationRenderer
			});
			
			properties.push({
				'name': 'Repeat',
				'text': getText('Repeat'),
				'value': isTrue(cell.getAttribute("Repeat")),
				'group': ' '+getText('Configuration')
			});
			properties.push({
				'name': 'Recalculate',
				'text': getText('Recalculate'),
				'value': isTrue(cell.getAttribute("Recalculate")),
				'group': ' '+getText('Configuration')
			});
		} else if (cell.value.nodeName == "Action") {
			bottomDesc = descBase + "Action primitives can be used to execute some action such as moving agents or dynamically create connections between them." +descriptionLink("/actions", "Actions");
			properties.push({
				'name': 'Trigger',
				'text': getText('Triggered by'),
				'value': cell.getAttribute("Trigger"),
				'group': ' '+getText('Configuration'),
				'editor': new Ext.form.ComboBox({
					triggerAction: "all",
					store: ['Timeout', 'Probability', 'Condition'],
					editable: false,
					selectOnFocus: true
				})
			});
			properties.push({
				'name': 'Value',
				'text': getText('Trigger Value')+' =',
				'value': cell.getAttribute("Value"),
				'group': ' '+getText('Configuration'),
				'editor': new Ext.form.customFields['code']({}),
				'renderer': equationRenderer
			});
			properties.push({
				'name': 'Action',
				'text': getText('Action')+' =',
				'value': cell.getAttribute("Action"),
				'group': ' '+getText('Configuration'),
				'editor': new Ext.form.customFields['code']({}),
				'renderer': equationRenderer
			});
			properties.push({
				'name': 'Repeat',
				'text': getText('Repeat'),
				'value': isTrue(cell.getAttribute("Repeat")),
				'group': ' '+getText('Configuration')
			});
			properties.push({
				'name': 'Recalculate',
				'text': getText('Recalculate'),
				'value': isTrue(cell.getAttribute("Recalculate")),
				'group': ' '+getText('Configuration')
			});
		} else if (cell.value.nodeName == "State") {
			bottomDesc = descBase + "The primitive representing the current state of an agent. A boolean yes/no property. You can connect states with transitions to move an agent between states."+descriptionLink("/states", "States");

			properties.push({
				'name': 'Active',
				'text': getText('Start Active')+' = ',
				'value': cell.getAttribute("Active"),
				'group': ' '+getText('Configuration'),
				'editor': new Ext.form.customFields['code']({}),
				'renderer': equationRenderer
			});
			
			properties.push({
				'name': 'Residency',
				'text': getText('Residency')+' = ',
				'value': cell.getAttribute("Residency"),
				'group': ' '+getText('Configuration'),
				'editor': new Ext.form.customFields['code']({}),
				'renderer': equationRenderer
			});

		} else if (cell.value.nodeName == "Agents") {
			bottomDesc = descBase + "Agent populations hold a collection of agents: individually simulated entities which may interact with each other."+descriptionLink("/agentpopulations", "Agent Populations");


			var dat = [];
			var folders = primitives("Folder");
			for (var i = 0; i < folders.length; i++) {
				if (folders[i].getAttribute("Type") == "Agent" /*&& connected(folders[i],cell)*/) {
					dat.push([folders[i].id, clean(folders[i].getAttribute("name"))])
				}
			}

			var agentStore = new Ext.data.ArrayStore({
				id: 0,
				fields: ['myId', 'displayText'],
				data: dat
			});


			properties.push({
				'name': 'Agent',
				'text': getText('Agent Base'),
				'value': cell.getAttribute("Agent"),
				'group': ' '+getText('Configuration'),
				'editor': new Ext.form.ComboBox({
					triggerAction: "all",
					queryMode: 'local',
					store: agentStore,
					selectOnFocus: true,
					valueField: 'myId',
					editable: false,
					displayField: 'displayText'
				}),
				'renderer': primitiveRenderer
			});

			properties.push({
				'name': 'Size',
				'text': getText('Population Size'),
				'value': cell.getAttribute("Size"),
				'group': ' '+getText('Configuration'),
				'editor': {
			        xtype: 'numberfield',
			        minValue: 0,
					allowDecimals: false
			    }
			});
			
			properties.push({
				'name': 'GeoWidth',
				'text': getText('Width'),
				'value': cell.getAttribute("GeoWidth"),
				'group': ' '+getText('Geometry'),
				'editor': new Ext.form.customFields['code']({}),
				renderer: equationRenderer
			});
			
			properties.push({
				'name': 'GeoHeight',
				'text': getText('Height'),
				'value': cell.getAttribute("GeoHeight"),
				'group': ' '+getText('Geometry'),
				'editor': new Ext.form.customFields['code']({}),
				renderer: equationRenderer
			});
			
			properties.push({
				'name': 'GeoDimUnits',
				'text': getText('Dimension Units'),
				'value': cell.getAttribute("GeoDimUnits"),
				'group': ' '+getText('Geometry'),
				'editor': new Ext.form.customFields['units']({})
			});
			
			properties.push({
				'name': 'GeoWrap',
				'text': getText('Wrap Around'),
				'value': isTrue(cell.getAttribute("GeoWrap")),
				'group': ' '+getText('Geometry')
			});
			
			properties.push({
				'name': 'Placement',
				'text': getText('Placement Method'),
				'value': cell.getAttribute("Placement"),
				'group': ' '+getText('Geometry'),
				'editor': new Ext.form.ComboBox({
					triggerAction: "all",
					queryMode: 'local',
					selectOnFocus: true,
					editable: false,
					store: [["Random", getText("Random")], ["Grid", getText("Grid")], ["Ellipse", getText("Ellipse")], ["Network", getText("Network")], ["Custom Function", getText("Custom Function")]]
				}),
				'renderer': primitiveRenderer
			});
			
			properties.push({
				'name': 'PlacementFunction',
				'text': getText('Custom Function'),
				'value': cell.getAttribute("PlacementFunction"),
				'group': ' '+getText('Geometry'),
				'editor': new Ext.form.customFields['code']({}),
				renderer: equationRenderer
			});
			
			properties.push({
				'name': 'Network',
				'text': getText('Network Structure'),
				'value': cell.getAttribute("Network"),
				'group': ' '+getText('Network'),
				'editor': new Ext.form.ComboBox({
					triggerAction: "all",
					queryMode: 'local',
					selectOnFocus: true,
					editable: false,
					store: [["None", getText("None")], ["Custom Function", getText("Custom Function")]]
				})
			});
			
			properties.push({
				'name': 'NetworkFunction',
				'text': getText('Custom Function'),
				'value': cell.getAttribute("NetworkFunction"),
				'group': ' '+getText('Network'),
				'editor': new Ext.form.customFields['code']({}),
				renderer: equationRenderer
			});
			


		} else if (cellType == "Ghost") {
			bottomDesc = descBase + "This item is a 'Ghost' of another primitive. It mirrors the values and properties of its source primitive. You cannot edit the properties of the Ghost. You need to instead edit the properties of its source.";
			bottomDesc = bottomDesc + "<br/><p><center><a href='#' onclick='var x = findID(getSelected()[0].getAttribute(\"Source\"));highlight(x);'>Show Source</a></center></p>"+descriptionLink("/ghosting", "Ghosts");
		} else if (cellType == "Converter") {
			bottomDesc = descBase + "Converters store a table of input and output data. When the input source takes on one of the input values, the converter takes on the corresponding output value. If no specific input value exists for the current input source value, then the nearest input neighbors are averaged. "+descriptionLink("/converters", "Converters");
			var n = neighborhood(cell);
			var dat = [
				["Time", "Time"]
			];
			for (var i = 0; i < n.length; i++) {
				if(! n[i].linkHidden){
					dat.push([n[i].item.id, clean(n[i].item.getAttribute("name"))]);
				}
			}
			var converterStore = new Ext.data.ArrayStore({
				id: 0,
				fields: ['myId', 'displayText'],
				data: dat
			});



			properties.push({
				'name': 'Source',
				'text': getText('Input Source'),
				'value': cell.getAttribute("Source"),
				'group': ' '+getText('Configuration'),
				'editor': new Ext.form.ComboBox({
					triggerAction: "all",
					queryMode: 'local',
					store: converterStore,
					selectOnFocus: true,
					valueField: 'myId',
					editable: false,
					displayField: 'displayText'
				}),
				'renderer': primitiveRenderer
			});
			properties.push({
				'name': 'Data',
				'text': getText('Data'),
				'value': cell.getAttribute("Data"),
				'group': getText('Input/Output Table'),
				'editor': new Ext.form.customFields['converter']({})
			});
			properties.push({
				'name': 'Interpolation',
				'text': getText('Interpolation'),
				'value': cell.getAttribute("Interpolation"),
				'group': ' '+getText('Configuration'),
				'editor': new Ext.form.ComboBox({
					triggerAction: "all",
					store: [['None', getText("None")], ['Linear', getText("Linear")]],
					editable: false,
					selectOnFocus: true
				})
			});
		} else if (cellType == "Picture") {
			bottomDesc = descBase + "Pictures can make your model diagram come alive. Use the picture settings in the Styles section of the main toolbar to change the picture."+descriptionLink("/diagramming", "Modeling Diagramming");
		}
		configPanel.removeAll();

		

		if (topDesc != "") {
			topItems.push(Ext.create('Ext.Component', {
				html: '<div class="'+((drupal_node_ID == -1)?"":"sidebar_top")+'">'+topDesc+'</div>'
			}));
		}
		if (bottomDesc != "") {
			bottomItems.push(Ext.create('Ext.Component', {
				html: '<div class="sidebar_bottom">'+bottomDesc+'</div>'
			}))
		}


		createGrid(properties, topItems, bottomItems, cell);


		if (drupal_node_ID != -1) {
			try {
				stWidget.addEntry({
					"service": "twitter",
					"element": document.getElementById('st_twitter_button'),
					"url": "http://InsightMaker.com/insight/" + drupal_node_ID,
					"title": graph_title,
					"type": "chicklet",
					"image": "http://insightmaker.com/sites/default/files/logo.png",
					"summary": graph_description
				});
				stWidget.addEntry({
					"service": "facebook",
					"element": document.getElementById('st_facebook_button'),
					"url": "http://InsightMaker.com/insight/" + drupal_node_ID,
					"title": graph_title,
					"type": "chicklet",
					"image": "http://insightmaker.com/sites/default/files/logo.png",
					"summary": graph_description
				});
				stWidget.addEntry({
					"service": "linkedin",
					"element": document.getElementById('st_linkedin_button'),
					"url": "http://InsightMaker.com/insight/" + drupal_node_ID,
					"title": graph_title,
					"type": "chicklet",
					"image": "http://insightmaker.com/sites/default/files/logo.png",
					"summary": graph_description
				});
				stWidget.addEntry({
					"service": "email",
					"element": document.getElementById('st_mail_button'),
					"url": "http://InsightMaker.com/insight/" + drupal_node_ID,
					"title": graph_title,
					"type": "chicklet",
					"image": "http://insightmaker.com/sites/default/files/logo.png",
					"summary": graph_description
				});
			} catch (err) {

			}
		}
	}


	selectionChanged(false);

	if (drupal_node_ID == -1) {
		setSaveEnabled(true);
	} else {
		setSaveEnabled(false);
	}

	updateWindowTitle();

	if (!saved_enabled) {
		ribbonPanelItems().getComponent('savegroup').setVisible(false);
	}

	handelCursors();
	
	handleUnfoldToolbar();

	if (is_embed && (is_zoom == 1)) {
		graph.getView().setScale(0.25);
		graph.fit();
		graph.fit();
	}


};


var surpressCloseWarning = false;

function confirmClose() {
	if (!surpressCloseWarning) {
		if ((!saved_enabled) || ribbonPanelItems().getComponent('savegroup').getComponent('savebut').disabled) {

		} else {
			return getText("You have made unsaved changes to this Insight. If you close now, they will be lost.");
		}
	} else {
		surpressCloseWarning = false;
	}
}


Ext.EventManager.on(window, 'beforeunload', function() {
   return confirmClose();
});


Ext.example = function() {
	var msgCt;

	function createBox(t, s) {
		return '<div class="msg"><h3>' + t + '</h3><p>' + s + '</p></div>';
	}
	return {
		msg: function(title, format) {
			if (!msgCt) {
				msgCt = Ext.core.DomHelper.insertFirst(document.body, {
					id: 'msg-div'
				}, true);
			}
			var s = Ext.String.format.apply(String, Array.prototype.slice.call(arguments, 1));
			var m = Ext.core.DomHelper.append(msgCt, createBox(title, s), true);
			m.hide();
			m.slideIn('t').ghost("t", {
				delay: 4500,
				remove: true
			});
		}
	};
}();


Ext.round = function(n, d) {
	var result = Number(n);
	if (typeof d == 'number') {
		d = Math.pow(10, d);
		result = Math.round(n * d) / d;
	}
	return result;
};

var makeGhost = function() {
		var item = graph.getSelectionCell();
		var parent = graph.getDefaultParent();
		
		var location = getPosition(item);

		var vertex;
		var style = item.getStyle();
		style = mxUtils.setStyle(style, "opacity", 30);
		graph.getModel().beginUpdate();

		vertex = graph.insertVertex(parent, null, primitiveBank.ghost.cloneNode(true), location[0] + 10, location[1] + 10, item.getGeometry().width, item.getGeometry().height, style);
		vertex.value.setAttribute("Source", item.id);
		vertex.value.setAttribute("name", item.getAttribute("name"));
		graph.setSelectionCell(vertex);
		graph.getModel().endUpdate();

	};
	
var makeFolder = function() {
	var group = graph.groupCells(null, 20);
	group.setConnectable(true);
	graph.setSelectionCell(group);
	graph.orderCells(true);
};



function showContextMenu(node, e) {
	var selectedItems = getSelected();
	var folder = false;
	if(selectedItems.length > 0){
		folder = selectedItems[0].value.nodeName == "Folder" && (! getCollapsed(selectedItems[0]));
	}
	var selected = selectedItems.length > 0 && (! folder);
	
		
	var menuItems = [];
	if(! selected){
		var menuItems = [{
			text: getText("Create Stock"),
			iconCls: 'stock-icon-small',
			handler: function() {
				graph.model.beginUpdate();
				var pt = graph.getPointForEvent(e);
				var cell = createPrimitive(getText("New Stock"), "Stock", [pt.x, pt.y], [100, 40]);
				graph.model.endUpdate();
				if(folder){
					setParent(cell, selectedItems[0]);
				}
				setSelected(cell);
				
				setTimeout(function(){graph.cellEditor.startEditing(cell)},20);
			}
		}, {
			text: getText("Create Variable"),
			iconCls: 'parameter-icon-small',
			handler: function() {
				graph.model.beginUpdate();
				var pt = graph.getPointForEvent(e);
				var cell = createPrimitive(getText("New Variable"), "Variable", [pt.x, pt.y], [120, 50]);
				graph.model.endUpdate();
				if(folder){
					setParent(cell, selectedItems[0]);
				}
				setSelected(cell);
				
				setTimeout(function(){graph.cellEditor.startEditing(cell)},20);
			}
		}, {
			text: getText("Create Converter"),
			iconCls: 'converter-icon',
			handler: function() {
				graph.model.beginUpdate();
				var pt = graph.getPointForEvent(e);
				var cell = createPrimitive(getText("New Converter"), "Converter", [pt.x, pt.y], [120, 50]);
				graph.model.endUpdate();
				if(folder){
					setParent(cell, selectedItems[0]);
				}
				setSelected(cell);
				
				setTimeout(function(){graph.cellEditor.startEditing(cell)},20);
			}
		}, '-',
		{
			text: getText("Create State"),
			handler: function() {
				graph.model.beginUpdate();
				var pt = graph.getPointForEvent(e);
				var cell = createPrimitive(getText("New State"), "State", [pt.x, pt.y], [100, 40]);
				graph.model.endUpdate();
				if(folder){
					setParent(cell, selectedItems[0]);
				}
				setSelected(cell);
				
				setTimeout(function(){graph.cellEditor.startEditing(cell)},20);
				
			}
		},
		{
			text: getText("Create Action"),
			handler: function() {
				graph.model.beginUpdate();
				var pt = graph.getPointForEvent(e);
				var cell = createPrimitive(getText("New Action"), "Action", [pt.x, pt.y], [120, 50]);
				graph.model.endUpdate();
				if(folder){
					setParent(cell, selectedItems[0]);
				}
				setSelected(cell);
				
				setTimeout(function(){graph.cellEditor.startEditing(cell)},20);
			}
		},
		{
			text: getText("Create Agent Population"),
			handler: function() {
				graph.model.beginUpdate();
				var pt = graph.getPointForEvent(e);
				var cell = createPrimitive(getText("Agent Population"), "Agents", [pt.x, pt.y], [170, 80]);
				graph.model.endUpdate();
				if(folder){
					setParent(cell, selectedItems[0]);
				}
				setSelected(cell);
				
				setTimeout(function(){graph.cellEditor.startEditing(cell)},20);
			}
		}, '-',
		{
			text: getText("Create Text"),
			iconCls: 'font-icon',
			handler: function() {
				graph.model.beginUpdate();
				var pt = graph.getPointForEvent(e);
				var cell = createPrimitive(getText("New Text"), "Text", [pt.x, pt.y], [200, 50]);
				graph.model.endUpdate();
				if(folder){
					setParent(cell, selectedItems[0]);
				}
				setSelected(cell);
				
				setTimeout(function(){graph.cellEditor.startEditing(cell)},20);
			}
		}, {
			text: getText("Create Picture"),
			iconCls: 'picture-icon',
			handler: function() {
				graph.model.beginUpdate();
				var pt = graph.getPointForEvent(e);
				var cell = createPrimitive("", "Picture", [pt.x, pt.y], [64, 64]);
				graph.model.endUpdate();
				if(folder){
					setParent(cell, selectedItems[0]);
				}
				setPicture(cell);
				setSelected(cell);
				
				setTimeout(function(){graph.cellEditor.startEditing(cell)},20);
			}

		}, {
			text: getText("Create Button"),
			iconCls: 'button-icon',
			handler: function() {
				graph.model.beginUpdate();
				var pt = graph.getPointForEvent(e);
				var cell = createPrimitive(getText("New Button"), "Button", [pt.x, pt.y], [120, 40]);
				graph.model.endUpdate();
				if(folder){
					setParent(cell, selectedItems[0]);
				}
				setSelected(cell);
				
				setTimeout(function(){graph.cellEditor.startEditing(cell)},20);
			}
		}];
		if(! is_ebook){

			
			menuItems = menuItems.concat([
				'-',
				{
					text: getText("Insert Insight Maker Model"),
					handler: function() {
						showInsertModelWindow(graph.getPointForEvent(e));
					}
				}
			]);
		}
		
	}else{
		menuItems = [
		{
			text: getText("Ghost Primitive"),
			iconCls: 'ghost-icon',
			disabled: graph.getSelectionCount() != 1 || ((!isValued(graph.getSelectionCell()) && graph.getSelectionCell().value.nodeName != "Picture")) || graph.getSelectionCell().value.nodeName == "Flow" || graph.getSelectionCell().value.nodeName == "Ghost",
			handler: makeGhost
		},
		{
			text: getText("Create Folder"),
			iconCls: 'folder-icon',
			disabled: !selected,
			handler: makeFolder
		},
		, '-',
		{
			text: getText('Delete'),
			iconCls: 'delete-icon',
			disabled: !selected,
			handler: function() {
				graph.removeCells(graph.getSelectionCells(), false);
			}
		}];
	}

	var menu = new Ext.menu.Menu({
		items: menuItems
	});



	// Adds a small offset to make sure the mouse released event
	// is routed via the shape which was initially clicked. This
	// is required to avoid a reset of the selection in Safari.
	menu.showAt([mxEvent.getClientX(e) + 1, mxEvent.getClientY(e) + 1]);
}


var blankGraphTemplate = "<mxGraphModel>\n  <root>\n    <mxCell id=\"0\"\/>\n    <mxCell id=\"1\" parent=\"0\"\/>\n    <Picture name=\"\" Note=\"\" Image=\"http:\/\/insightmaker.com\/builder\/images\/rabbit.jpg\" FlipHorizontal=\"false\" FlipVertical=\"false\" LabelPosition=\"Bottom\" id=\"17\">\n      <mxCell style=\"picture;image=http:\/\/insightmaker.com\/builder\/images\/rabbit.jpg;imageFlipV=0;imageFlipH=0;shape=image\" parent=\"1\" vertex=\"1\">\n        <mxGeometry x=\"10\" y=\"192.75\" width=\"210\" height=\"224.25\" as=\"geometry\"\/>\n      <\/mxCell>\n    <\/Picture>\n    <Setting Note=\"\" Version=\"25\" TimeLength=\"20\" TimeStart=\"0\" TimeStep=\"1\" TimeUnits=\"Years\" StrictUnits=\"true\" Units=\"\" HiddenUIGroups=\"Validation,User Interface\" SolutionAlgorithm=\"RK1\" BackgroundColor=\"white\" Throttle=\"1\" Macros=\"\" SensitivityPrimitives=\"\" SensitivityRuns=\"50\" SensitivityBounds=\"50, 80, 95, 100\" SensitivityShowRuns=\"false\" id=\"2\">\n      <mxCell parent=\"1\" vertex=\"1\" visible=\"0\">\n        <mxGeometry x=\"20\" y=\"20\" width=\"80\" height=\"40\" as=\"geometry\"\/>\n      <\/mxCell>\n    <\/Setting>\n    <Display name=\"Default Display\" Note=\"\" Type=\"Time Series\" xAxis=\"Time (%u)\" yAxis=\"\" ThreeDimensional=\"false\" Primitives=\"4\" AutoAddPrimitives=\"true\" ScatterplotOrder=\"X Primitive, Y Primitive\" Image=\"Display\" yAxis2=\"\" Primitives2=\"\" showMarkers=\"false\" showLines=\"true\" showArea=\"false\" id=\"3\">\n      <mxCell style=\"roundImage;image=\/builder\/images\/DisplayFull.png;\" parent=\"1\" vertex=\"1\" visible=\"0\">\n        <mxGeometry x=\"50\" y=\"20\" width=\"64\" height=\"64\" as=\"geometry\"\/>\n      <\/mxCell>\n    <\/Display>\n    <Stock name=\"Rabbits\" Note=\"The number of rabbits currently alive.\" InitialValue=\"200\" StockMode=\"Store\" Delay=\"10\" Volume=\"100\" NonNegative=\"false\" Units=\"Unitless\" MaxConstraintUsed=\"false\" MinConstraintUsed=\"false\" MaxConstraint=\"100\" MinConstraint=\"0\" ShowSlider=\"false\" SliderMax=\"1000\" SliderMin=\"0\" Image=\"None\" AllowNegatives=\"true\" LabelPosition=\"Middle\" FlipHorizontal=\"false\" FlipVertical=\"false\" id=\"4\">\n      <mxCell style=\"stock;labelBackgroundColor=none\" parent=\"1\" vertex=\"1\">\n        <mxGeometry x=\"407.5\" y=\"422\" width=\"100\" height=\"40\" as=\"geometry\"\/>\n      <\/mxCell>\n    <\/Stock>\n    <Flow name=\"Births\" Note=\"The number of rabbits born each year.\" FlowRate=\"[Rabbits]*[Rabbit Birth Rate]\" OnlyPositive=\"true\" TimeIndependent=\"false\" Units=\"Unitless\" MaxConstraintUsed=\"false\" MinConstraintUsed=\"false\" MaxConstraint=\"100\" MinConstraint=\"0\" ShowSlider=\"false\" SliderMax=\"100\" SliderMin=\"0\" id=\"5\">\n      <mxCell style=\"\" parent=\"1\" target=\"4\" edge=\"1\">\n        <mxGeometry x=\"47.5\" y=\"32\" width=\"100\" height=\"100\" as=\"geometry\">\n          <mxPoint x=\"457.5\" y=\"184.5\" as=\"sourcePoint\"\/>\n          <mxPoint x=\"57.5\" y=\"282\" as=\"targetPoint\"\/>\n          <mxPoint x=\"-0.5\" y=\"5\" as=\"offset\"\/>\n        <\/mxGeometry>\n      <\/mxCell>\n    <\/Flow>\n    <Variable name=\"Rabbit Birth Rate\" Note=\"The proportional increase in the number of rabbits per year.\" Equation=\"0.1\" Units=\"Unitless\" MaxConstraintUsed=\"false\" MinConstraintUsed=\"false\" MaxConstraint=\"100\" MinConstraint=\"0\" ShowSlider=\"false\" SliderMax=\"1\" SliderMin=\"0\" Image=\"None\" LabelPosition=\"Middle\" FlipHorizontal=\"false\" FlipVertical=\"false\" id=\"6\">\n      <mxCell style=\"parameter;labelBackgroundColor=none\" parent=\"1\" vertex=\"1\">\n        <mxGeometry x=\"551.25\" y=\"157\" width=\"140\" height=\"50\" as=\"geometry\"\/>\n      <\/mxCell>\n    <\/Variable>\n    <Text name=\"&amp;larr; This is a Stock\" LabelPosition=\"Middle\" id=\"8\">\n      <mxCell style=\"textArea;fontStyle=1;fontFamily=Verdana;fontSize=14;strokeColor=none;fontColor=#000000;labelBackgroundColor=none\" parent=\"1\" vertex=\"1\">\n        <mxGeometry x=\"536.25\" y=\"392\" width=\"160\" height=\"50\" as=\"geometry\"\/>\n      <\/mxCell>\n    <\/Text>\n    <Text name=\"Stocks store things like money or water or, in this case, rabbits.\" LabelPosition=\"Middle\" id=\"9\">\n      <mxCell style=\"textArea;fontStyle=0;fontFamily=Verdana;fontSize=14;strokeColor=none;fontColor=#000000;labelBackgroundColor=none\" parent=\"1\" vertex=\"1\">\n        <mxGeometry x=\"516.25\" y=\"428.5\" width=\"210\" height=\"50\" as=\"geometry\"\/>\n      <\/mxCell>\n    <\/Text>\n    <Text name=\"This is a Flow &amp;rarr;\" LabelPosition=\"Middle\" id=\"10\">\n      <mxCell style=\"textArea;fontStyle=1;fontFamily=Verdana;fontSize=14;strokeColor=none;fontColor=#000000;labelBackgroundColor=none\" parent=\"1\" vertex=\"1\">\n        <mxGeometry x=\"267.5\" y=\"182\" width=\"150\" height=\"50\" as=\"geometry\"\/>\n      <\/mxCell>\n    <\/Text>\n    <Text name=\"Flows move material between Stocks. In this case it represents the birth of new rabbits.\" LabelPosition=\"Middle\" id=\"11\">\n      <mxCell style=\"textArea;fontStyle=0;fontFamily=Verdana;fontSize=14;strokeColor=none;fontColor=#000000;labelBackgroundColor=none\" parent=\"1\" vertex=\"1\">\n        <mxGeometry x=\"227.5\" y=\"224.5\" width=\"210\" height=\"70\" as=\"geometry\"\/>\n      <\/mxCell>\n    <\/Text>\n    <Text name=\"This is a Variable&#xa;\" LabelPosition=\"Middle\" id=\"12\">\n      <mxCell style=\"textArea;fontStyle=1;fontFamily=Verdana;fontSize=14;strokeColor=none;fontColor=#000000;labelBackgroundColor=none\" parent=\"1\" vertex=\"1\">\n        <mxGeometry x=\"496.25\" y=\"62\" width=\"245\" height=\"35\" as=\"geometry\"\/>\n      <\/mxCell>\n    <\/Text>\n    <Link name=\"Link\" Note=\"\" BiDirectional=\"false\" id=\"7\">\n      <mxCell style=\"entity\" parent=\"1\" source=\"6\" target=\"5\" edge=\"1\">\n        <mxGeometry x=\"47.5\" y=\"32\" width=\"100\" height=\"100\" as=\"geometry\">\n          <mxPoint x=\"47.5\" y=\"132\" as=\"sourcePoint\"\/>\n          <mxPoint x=\"147.5\" y=\"32\" as=\"targetPoint\"\/>\n        <\/mxGeometry>\n      <\/mxCell>\n    <\/Link>\n    <Text name=\"&amp;larr; This is a Link\" LabelPosition=\"Middle\" id=\"13\">\n      <mxCell style=\"textArea;fontStyle=1;fontFamily=Verdana;fontSize=14;strokeColor=none;fontColor=#000000;labelBackgroundColor=none\" parent=\"1\" vertex=\"1\">\n        <mxGeometry x=\"511.25\" y=\"247\" width=\"210\" height=\"30\" as=\"geometry\"\/>\n      <\/mxCell>\n    <\/Text>\n    <Text name=\"It allows the equation for &lt;i&gt;Births&lt;\/i&gt; to reference the &lt;i&gt;Rabbit Birth Rate&lt;\/i&gt;.\" LabelPosition=\"Middle\" id=\"14\">\n      <mxCell style=\"textArea;fontStyle=0;fontFamily=Verdana;fontSize=14;strokeColor=none;fontColor=#000000;align=center;labelBackgroundColor=none\" parent=\"1\" vertex=\"1\">\n        <mxGeometry x=\"516.25\" y=\"271.5\" width=\"210\" height=\"70\" as=\"geometry\"\/>\n      <\/mxCell>\n    <\/Text>\n    <Text name=\"Here is a simple model to get you started. It simulates a rabbit population over the course of 20 years. Luckily for these rabbits, there is no rabbit mortality! &#xa;&#xa;Click the &lt;i&gt;Run Simulation&lt;\/i&gt; button on the right of the toolbar to see how the rabbit population will grow over time.\" LabelPosition=\"Middle\" id=\"15\">\n      <mxCell style=\"textArea;fontStyle=0;fontFamily=Times New Roman;fontSize=18;strokeColor=none;fontColor=#333300;align=left;fillColor=none;labelBackgroundColor=none\" parent=\"1\" vertex=\"1\">\n        <mxGeometry x=\"15\" y=\"12.75\" width=\"405\" height=\"150\" as=\"geometry\"\/>\n      <\/mxCell>\n    <\/Text>\n    <Text name=\" Move your mouse over it and click the &quot;=&quot; to inspect its value.&#xa;&amp;darr;\" LabelPosition=\"Middle\" id=\"18\">\n      <mxCell style=\"textArea;fontStyle=0;fontFamily=Verdana;fontSize=14;strokeColor=none;fontColor=#000000;labelBackgroundColor=none\" parent=\"1\" vertex=\"1\">\n        <mxGeometry x=\"492.5\" y=\"92\" width=\"257.5\" height=\"60\" as=\"geometry\"\/>\n      <\/mxCell>\n    <\/Text>\n    <Text name=\"&lt;b&gt;Adding Primitives:&lt;\/b&gt; Select type in toolbar and then click in the canvas.&#xa;&lt;b&gt;Adding Connections:&lt;\/b&gt; Select type in toolbar, hover mouse over connectable primitive and drag arrow.\" LabelPosition=\"Middle\" id=\"21\">\n      <mxCell style=\"textArea;fontStyle=0;fontFamily=Verdana;fontSize=14;strokeColor=none;fontColor=#808080;align=center;labelBackgroundColor=none\" parent=\"1\" vertex=\"1\">\n        <mxGeometry x=\"5\" y=\"480\" width=\"745\" height=\"70\" as=\"geometry\"\/>\n      <\/mxCell>\n    <\/Text>\n    <Link name=\"Link\" Note=\"\" BiDirectional=\"false\" id=\"22\">\n      <mxCell style=\"entity\" parent=\"1\" source=\"4\" target=\"5\" edge=\"1\">\n        <mxGeometry width=\"100\" height=\"100\" as=\"geometry\">\n          <mxPoint y=\"100\" as=\"sourcePoint\"\/>\n          <mxPoint x=\"100\" as=\"targetPoint\"\/>\n          <Array as=\"points\">\n            <mxPoint x=\"380\" y=\"420\"\/>\n            <mxPoint x=\"360\" y=\"380\"\/>\n            <mxPoint x=\"360\" y=\"340\"\/>\n            <mxPoint x=\"380\" y=\"310\"\/>\n            <mxPoint x=\"407\" y=\"292\"\/>\n            <mxPoint x=\"440\" y=\"290\"\/>\n          <\/Array>\n        <\/mxGeometry>\n      <\/mxCell>\n    <\/Link>\n    <Button name=\"Clear Sample Model\" Note=\"\" Function=\"clearModel()\" Image=\"None\" FlipHorizontal=\"false\" FlipVertical=\"false\" LabelPosition=\"Middle\" id=\"23\">\n      <mxCell style=\"button;fontSize=20;fillColor=#FFFF99;strokeColor=#FF9900;fontColor=#0000FF;fontStyle=5\" parent=\"1\" vertex=\"1\">\n        <mxGeometry x=\"80\" y=\"418.5\" width=\"240\" height=\"60\" as=\"geometry\"\/>\n      <\/mxCell>\n    <\/Button>\n  <\/root>\n<\/mxGraphModel>\n";
