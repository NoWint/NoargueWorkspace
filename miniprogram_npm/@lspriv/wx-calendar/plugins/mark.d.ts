import type { Plugin, TrackDateResult } from '../basic/service';
import type { CalendarMark, CalendarStyleMark, CalendarDay, WcScheduleInfo } from '../interface/calendar';
import type { CalendarInstance } from '../interface/component';
export declare const SCHEDULE_MARK_ORIGIN = "component_prop_marks";
export declare class MarkPlugin implements Plugin {
    static KEY: "mark";
    private _marks_;
    update(instance: CalendarInstance, marks: Array<CalendarMark | CalendarStyleMark>): void;
    PLUGIN_TRACK_DATE(date: CalendarDay): TrackDateResult | null;
    PLUGIN_TRACK_SCHEDULE(date: CalendarDay, id?: string): WcScheduleInfo | null;
}
export declare const MARK_PLUGIN_KEY: "mark";
