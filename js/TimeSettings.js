"use strict";
/*

Copyright 2010-2013 Scott Fortmann-Roe. All rights reserved.

This file may distributed and/or modified under the
terms of the Insight Maker Public License (http://insightMaker.com/impl).

*/

var timeSettingsFn = function(){
    var setting = getSetting();
	
	showTimeSettings({
		algorithm: setting.getAttribute("SolutionAlgorithm"),
		timeStep: setting.getAttribute("TimeStep"),
		timeStart: setting.getAttribute("TimeStart"),
		timeUnits: setting.getAttribute("TimeUnits"),
		timeLength: setting.getAttribute("TimeLength"),
		timePause: setting.getAttribute("TimePause")
	});
}

function showTimeSettings(config)
{
    var configWin = new Ext.Window({
        layout: 'fit',
		closeAction: 'destroy',
        modal: true,
        title: getText("Simulation Time Settings"),
        width:  Math.min(Ext.getBody().getViewSize().width, 370),
        height:  Math.min(Ext.getBody().getViewSize().height, ((! config.cell)?400:180)),
        resizable: false,
        plain: true,
        items: [new Ext.FormPanel({
            fieldDefaults: {
                labelWidth: 150
            },
			autoScroll: false,
            frame: true,
            bodyStyle: 'padding:5px 5px 0',
            width: 450,
            defaults: {
                width: 330
            },
			id: "timeSettingsForm",
            defaultType: 'textfield',

            items: [
			new Ext.form.field.Checkbox({
				hidden: ! config.cell,
                fieldLabel: getText('Custom Time Settings'),
                id: 'sEnabled',
				checked: config.enabled,
				listeners: {
					change: function(combo, newValue, oldValue){
						Ext.getCmp("sSolutionAlgo").setDisabled(! newValue);
						Ext.getCmp("stimestep").setDisabled(!newValue);
					}
				}
            }),
			new Ext.form.NumberField({
				hidden: config.cell,
                fieldLabel: getText('Simulation Start'),
                id: 'stimestart',
                allowBlank: false,
                minValue: 0,
                decimalPrecision: 12,
				value: config.timeStart
            }),
            new Ext.form.NumberField({
				hidden: config.cell,
                fieldLabel: getText('Simulation Length'),
                id: 'stimelength',
                allowBlank: false,
                minValue: 0,
                decimalPrecision: 12,
				value: config.timeLength
            }),
            {
				hidden: config.cell,
                xtype: 'radiogroup',
                id: "tunits",
                fieldLabel: getText('Time Units'),
                columns: 1,
                items: [
                {
                    boxLabel: getText('Seconds'),
                    name: 'tunits',
                    inputValue: "Seconds",
					checked: config.timeUnits == "Seconds"
                },
                {
                    boxLabel: getText('Minutes'),
                    name: 'tunits',
                    inputValue: "Minutes",
					checked: config.timeUnits == "Minutes"
                },
                {
                    boxLabel: getText('Hours'),
                    name: 'tunits',
                    inputValue: "Hours",
					checked: config.timeUnits == "Hours"
                },
                {
                    boxLabel: getText('Days'),
                    name: 'tunits',
                    inputValue: "Days",
					checked: config.timeUnits == "Days"
                },
                {
                    boxLabel: getText('Weeks'),
                    name: 'tunits',
                    inputValue: "Weeks",
					checked: config.timeUnits == "Weeks"
                },
                {
                    boxLabel: getText('Months'),
                    name: 'tunits',
                    inputValue: "Months",
					checked: config.timeUnits == "Months"
                },
                {
                    boxLabel: getText('Years'),
                    name: 'tunits',
                    inputValue: "Years",
					checked: config.timeUnits == "Years"
                }
                ]
            },
            new Ext.form.NumberField({
				hidden: config.cell,
                fieldLabel: getText('Pause Interval'),
                id: 'stimepause',
                allowBlank: true,
                minValue: 0,
                decimalPrecision: 12,
				value: config.timePause
            }),
            new Ext.form.ComboBox({
                fieldLabel: getText("Analysis Algorithm"),
                typeAhead: true,
                triggerAction: 'all',
                queryMode: 'local',
                selectOnFocus: true,
                forceSelection: true,
                store:  [ ['RK1', getText('Fast (Euler)')], ['RK4',getText('Accurate (RK4)')] ],
                id: 'sSolutionAlgo',
                editable: false,
				value: config.algorithm,
				disabled: (config.cell && (!config.enabled))
            }),
            new Ext.form.NumberField({
                fieldLabel: getText('Simulation Time Step'),
                id: 'stimestep',
                allowBlank: false,
                minValue: 0.000000000001,
                step: .1,
                decimalPrecision: 12,
				value: config.timeStep,
				disabled: (config.cell && (!config.enabled))
            })
            ],

            buttons: [{
				xtype:"button",
                scale: "large",
                iconCls: "cancel-icon",
                text: getText('Cancel'),
                handler: function() {
                    configWin.close();
                }
            },
            {
				xtype:"button",
                iconCls: "apply-icon",
                scale: "large",
                text: getText('Apply'),
                handler: function() {
				
                    graph.getModel().beginUpdate();
					if(config.cell){
						
	                    edit = new mxCellAttributeChange(
	                   	 	config.cell,
							"Solver",
							JSON.stringify({
								enabled: Ext.getCmp('sEnabled').getValue(),
								timeStep: Ext.getCmp('stimestep').getValue().toString(),
								algorithm: Ext.getCmp('sSolutionAlgo').getValue()
							})
						);
	                    graph.getModel().execute(edit);
						
					}else{
					    var setting = getSetting();
					

	                    var edit = new mxCellAttributeChange(
	                    setting, "SolutionAlgorithm",
	                    Ext.getCmp('sSolutionAlgo').getValue());
	                    graph.getModel().execute(edit);

	                    var edit = new mxCellAttributeChange(
	                    setting, "TimeLength",
	                    Ext.getCmp('stimelength').getValue().toString());
	                    graph.getModel().execute(edit);

	                    edit = new mxCellAttributeChange(
	                    setting, "TimeStart",
	                    Ext.getCmp('stimestart').getValue().toString());
	                    graph.getModel().execute(edit);

	                    edit = new mxCellAttributeChange(
	                    setting, "TimeStep",
	                    Ext.getCmp('stimestep').getValue().toString());
	                    graph.getModel().execute(edit);
						
	                    edit = new mxCellAttributeChange(
	                    setting, "TimePause",
	                    Ext.getCmp('stimepause').getValue());
	                    graph.getModel().execute(edit);

	                    edit = new mxCellAttributeChange(
	                    setting, "TimeUnits",
	                    Ext.getCmp('timeSettingsForm').getValues()['tunits']);
	                    graph.getModel().execute(edit);
					}

                    graph.getModel().endUpdate();
					
                    configWin.close();
                }
            }
            ]
        })]

    });

   
    configWin.show();
	
	return configWin;
};