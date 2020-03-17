export class PromiseUtil {
    static Delay(millis: number): Promise<void> {
        return new Promise(resolve => window.setTimeout(resolve, millis));
    }
}