import {
    _,
    AgAngleSelect,
    AgColorPicker,
    AgGroupComponent,
    AgSlider,
    Autowired,
    Component,
    PostConstruct,
    RefSelector,
    FontStyle,
    FontWeight,
    AgSelect,
    AxisType,
} from "@ag-grid-community/core";
import { ChartController } from "../../../chartController";
import { AxisTicksPanel } from "./axisTicksPanel";
import { Font, FontPanel, FontPanelParams } from "../fontPanel";
import { ChartTranslator } from "../../../chartTranslator";
import { find } from "../../../../../charts/util/array";
import { ChartAxisPosition } from "../../../../../charts/chart/chartAxis";
import { CartesianChartProxy } from "../../../chartProxies/cartesian/cartesianChartProxy";

export class AxisPanel extends Component {

    public static TEMPLATE =
        `<div>
            <ag-group-component ref="axisGroup">
                <ag-color-picker ref="axisColorInput"></ag-color-picker>
                <ag-slider ref="axisLineWidthSlider"></ag-slider>
                <ag-select ref="xAxisTypeSelect"></ag-select>
            </ag-group-component>
        </div>`;

    @RefSelector('axisGroup') private axisGroup: AgGroupComponent;
    @RefSelector('axisColorInput') private axisColorInput: AgColorPicker;
    @RefSelector('axisLineWidthSlider') private axisLineWidthSlider: AgSlider;
    @RefSelector('xAxisTypeSelect') private xAxisTypeSelect: AgSelect;

    @Autowired('chartTranslator') private chartTranslator: ChartTranslator;

    private readonly chartController: ChartController;
    private activePanels: Component[] = [];

    constructor(chartController: ChartController) {
        super();
        this.chartController = chartController;
    }

    @PostConstruct
    private init() {
        this.setTemplate(AxisPanel.TEMPLATE);

        this.initAxis();
        this.initAxisTicks();
        this.initAxisLabels();
    }

    private initAxis() {
        const { chartTranslator } = this;

        this.axisGroup
            .setTitle(chartTranslator.translate("axis"))
            .toggleGroupExpand(false)
            .hideEnabledCheckbox(true);

        this.axisColorInput
            .setLabel(chartTranslator.translate("color"))
            .setLabelWidth("flex")
            .setInputWidth(45)
            .setValue(this.getChartProxy().getAxisProperty("line.color"))
            .onValueChange(newColor => this.getChartProxy().setAxisProperty("line.color", newColor));

        this.axisLineWidthSlider
            .setLabel(chartTranslator.translate("thickness"))
            .setMaxValue(10)
            .setTextFieldWidth(45)
            .setValue(this.getChartProxy().getAxisProperty("line.width"))
            .onValueChange(newValue => this.getChartProxy().setAxisProperty("line.width", newValue));

        if (_.includes(['line', 'scatter', 'bubble'], this.chartController.getChartType()) && !this.chartController.isGrouping()) {
            const options: { value: AxisType | '', text: string }[] = [
                { value: '', text: chartTranslator.translate('automatic') }
            ];

            ['category', 'time', 'number'].forEach((type: AxisType) => {
                options.push({ value: type, text: chartTranslator.translate(type) });
            });

            this.xAxisTypeSelect
                .setLabel(chartTranslator.translate('xType'))
                .setLabelWidth('flex')
                .addOptions(options)
                .setValue(this.getChartProxy().getChartOption('xAxis.type') || '')
                .onValueChange(newValue => {
                    const chartProxy = this.getChartProxy();

                    chartProxy.setChartOption('xAxis.type', newValue.length && newValue);

                    this.chartController.updateForDataChange();
                });
        } else {
            this.xAxisTypeSelect.setDisplayed(false);
        }
    }

    private initAxisTicks() {
        const axisTicksComp = this.wireBean(new AxisTicksPanel(this.chartController));
        this.axisGroup.addItem(axisTicksComp);
        this.activePanels.push(axisTicksComp);
    }

    private initAxisLabels() {
        const chartProxy = this.getChartProxy();
        const initialFont = {
            family: chartProxy.getAxisProperty("label.fontFamily"),
            style: chartProxy.getAxisProperty<FontStyle>("label.fontStyle"),
            weight: chartProxy.getAxisProperty<FontWeight>("label.fontWeight"),
            size: chartProxy.getAxisProperty<number>("label.fontSize"),
            color: chartProxy.getAxisProperty("label.color")
        };

        const setFont = (font: Font) => {
            const chartProxy = this.getChartProxy();

            if (font.family) { chartProxy.setAxisProperty("label.fontFamily", font.family); }
            if (font.weight) { chartProxy.setAxisProperty("label.fontWeight", font.weight); }
            if (font.style) { chartProxy.setAxisProperty("label.fontStyle", font.style); }
            if (font.size) { chartProxy.setAxisProperty("label.fontSize", font.size); }
            if (font.color) { chartProxy.setAxisProperty("label.color", font.color); }

            chartProxy.getChart().performLayout();
        };

        const params: FontPanelParams = {
            enabled: true,
            suppressEnabledCheckbox: true,
            initialFont,
            setFont
        };

        const labelPanelComp = this.wireBean(new FontPanel(params));
        this.axisGroup.addItem(labelPanelComp);
        this.activePanels.push(labelPanelComp);

        this.addAdditionalLabelComps(labelPanelComp);
    }

    private addAdditionalLabelComps(labelPanelComp: FontPanel) {
        const createAngleComp = (label: string, initialValue: number, updateFunc: (value: number) => void) => {
            const rotationInput = this.wireBean(new AgAngleSelect()
                .setLabel(label)
                .setLabelWidth("flex")
                .setValue(initialValue || 0)
                .onValueChange(updateFunc));

            labelPanelComp.addCompToPanel(rotationInput);
        };

        const degreesSymbol = String.fromCharCode(176);
        const createLabelUpdateFunc = (axisPosition: ChartAxisPosition) => (newValue: number) => {
            const chart = this.getChartProxy().getChart();
            const axis = find(chart.axes, axis => axis.position === axisPosition);

            if (axis) {
                axis.label.rotation = newValue;
                chart.performLayout();
            }
        };

        const xRotationLabel = `${this.chartTranslator.translate("xRotation")} ${degreesSymbol}`;
        const yRotationLabel = `${this.chartTranslator.translate("yRotation")} ${degreesSymbol}`;

        createAngleComp(xRotationLabel, this.getChartProxy().getChartOption("xAxis.label.rotation"), createLabelUpdateFunc(ChartAxisPosition.Bottom));
        createAngleComp(yRotationLabel, this.getChartProxy().getChartOption("yAxis.label.rotation"), createLabelUpdateFunc(ChartAxisPosition.Left));

        const labelPaddingSlider = this.wireBean(new AgSlider());

        labelPaddingSlider.setLabel(this.chartTranslator.translate("padding"))
            .setValue(this.getChartProxy().getAxisProperty("label.padding"))
            .setMaxValue(30)
            .setTextFieldWidth(45)
            .onValueChange(newValue => this.getChartProxy().setAxisProperty("label.padding", newValue));

        labelPanelComp.addCompToPanel(labelPaddingSlider);
    }

    private destroyActivePanels(): void {
        this.activePanels.forEach(panel => {
            _.removeFromParent(panel.getGui());
            panel.destroy();
        });
    }

    private getChartProxy(): CartesianChartProxy<any> {
        return this.chartController.getChartProxy() as CartesianChartProxy<any>;
    }

    public destroy(): void {
        this.destroyActivePanels();
        super.destroy();
    }
}