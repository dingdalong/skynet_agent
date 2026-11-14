#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>
#import <React/RCTViewManager.h>

@interface RCT_EXTERN_MODULE(SkynetHost, RCTEventEmitter)
RCT_EXTERN_METHOD(command:(NSString *)name input:(NSDictionary *)input resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(setChrome:(NSArray *)colors lightContent:(BOOL)lightContent)
@end

@interface RCT_EXTERN_MODULE(SkynetWallpaperManager, RCTViewManager)
RCT_EXPORT_VIEW_PROPERTY(colors, NSArray)
@end

@interface RCT_EXTERN_MODULE(SkynetSceneFrameManager, RCTViewManager)
RCT_EXPORT_VIEW_PROPERTY(visible, BOOL)
@end

@interface RCT_EXTERN_MODULE(SkynetSurfaceManager, RCTViewManager)
RCT_EXPORT_VIEW_PROPERTY(active, BOOL)
RCT_EXPORT_VIEW_PROPERTY(appId, NSString)
RCT_EXPORT_VIEW_PROPERTY(backgroundHex, NSString)
RCT_EXPORT_VIEW_PROPERTY(reducedMotion, BOOL)
RCT_EXPORT_VIEW_PROPERTY(revealDurationMs, double)
@end
