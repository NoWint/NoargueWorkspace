import { CalendarHandler } from '../interface/component';
import { View } from './constants';
import type { CalendarData, CalendarPanel } from '../interface/component';
import type { CalendarDay, CalendarMonth, WcFullYear } from '../interface/calendar';
type Offsets = [wdx: number, offset: number];
export declare class PanelTool extends CalendarHandler {
    /**
     * 创建【月｜日程】视图面板数据
     * @param checked 选中日期
     */
    createMonthPanels(checked: CalendarDay): CalendarPanel[];
    /**
     * 创建周视图面板数据
     * @param checked 选中日期
     */
    createWeekPanels(checked: CalendarDay): CalendarPanel[];
    /**
     * 创建年视图面板数据
     * @param checked 选中日期
     */
    createAnnualPanels(checked: CalendarDay): WcFullYear[];
    /**
     * 刷新主面板数据
     * @param sets 变更数据，setData方法的参数
     */
    private refreshPanels;
    /**
     * 刷新主面板数据
     * @param offset 偏移量，单位月视图下为月，周视图下为周
     * @param checked 要设置的选中日期，不传则由offset计算出偏移后的月份同天或同星期日
     * @param curr 要设置的面板滑块的index，不传则由offset计算得出偏移后的index
     */
    refresh(offset: number, checked?: CalendarDay, current?: number, vibrate?: boolean): Promise<void>;
    /**
     * 刷新视图
     * @param view 指定视图
     */
    refreshView(view: View): Promise<void>;
    refreshOffsets(sets: Partial<CalendarData>, current?: number, checked?: CalendarDay): void;
    refreshOffsets(sets: Partial<CalendarData>, excludes?: number[]): void;
    /**
     * 刷新年度面板数据
     * @param offset 指定年份与当前年份的偏移量
     * @param curr 当前年面板swiper索引
     * @param nonAnimate 年面板swiper是否过渡动画
     */
    refreshAnnualPanels(offset: number, curr?: number, nonAnimate?: boolean): Promise<void>;
    /**
     * 创建单个月/周面板
     */
    createPanel(date: CalendarDay, key: number, offsets: Offsets, panels?: Array<CalendarPanel>): CalendarPanel;
    /**
     * 创建单个年度面板数据
     * @param year 指定年
     * @param key 指定key
     */
    createAnnualPanel(year: number, key: number): WcFullYear;
    private findWeekPanelIdx;
    toDate(date: string | number | Date | CalendarDay): Promise<void>;
    toWeekAdjoin(checked: CalendarDay, vibrate?: boolean): Promise<void>;
    toAnnualMonth(mon: CalendarMonth, toMonthView?: boolean): Promise<void>;
    toYear(year: number): Promise<void>;
    getFullYear(idx: number): WcFullYear;
    update(): Promise<void>;
    private calcWeekOffset;
    static calcPanelOffset(date: CalendarDay, weekstart: number): Offsets;
}
export {};
