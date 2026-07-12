import { PluginTracker, PluginInterception, PluginEventHandler } from '../basic/service';
type TplGetUL<T extends string, P extends string> = T extends `${P}${infer R}` ? Uppercase<R> | Lowercase<R> | Capitalize<Lowercase<R>> : never;
export declare function WcPlugin<TKey extends string>(key: TKey): <T extends {
    new (...args: any[]): any;
}>(constructor: T) => {
    new (...args: any[]): {
        [x: string]: any;
    };
    KEY: TKey;
} & T;
declare const PREFIX_TRACK = "PLUGIN_TRACK_";
declare const PREFIX_CATCH = "PLUGIN_CATCH_";
declare const PREFIX_ON = "PLUGIN_ON_";
type TrackKeys = TplGetUL<keyof PluginTracker, typeof PREFIX_TRACK>;
export declare function Track<TKey extends TrackKeys>(key: TKey): (target: any, propertyKey: string) => void;
type CatchKeys = TplGetUL<keyof PluginInterception, typeof PREFIX_CATCH>;
export declare function Catch<TKey extends CatchKeys>(key: TKey): (target: any, propertyKey: string) => void;
type OnKeys = TplGetUL<keyof PluginEventHandler, typeof PREFIX_ON>;
export declare function On<TKey extends OnKeys>(key: TKey): (target: any, propertyKey: string) => void;
export declare const Filter: (target: any, propertyKey: string) => void;
export {};
