#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>
#import <React/RCTViewManager.h>

@interface RCT_EXTERN_MODULE(SkynetHost, RCTEventEmitter)
RCT_EXTERN_METHOD(command:(NSString *)name input:(NSDictionary *)input resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject)
@end

@interface RCT_EXTERN_MODULE(SkynetWallpaperManager, RCTViewManager)
RCT_EXPORT_VIEW_PROPERTY(colors, NSArray)
@end

@interface RCT_EXTERN_MODULE(SkynetSurfaceManager, RCTViewManager)
RCT_EXPORT_VIEW_PROPERTY(appId, NSString)
RCT_EXPORT_VIEW_PROPERTY(backgroundHex, NSString)
RCT_EXPORT_VIEW_PROPERTY(reducedMotion, BOOL)
RCT_EXPORT_VIEW_PROPERTY(revealDurationMs, double)
@end

@interface RCT_EXTERN_MODULE(SkynetSceneManager, RCTViewManager)
RCT_EXPORT_VIEW_PROPERTY(transitionKey, NSString)
RCT_EXPORT_VIEW_PROPERTY(animateLayout, BOOL)
RCT_EXPORT_VIEW_PROPERTY(reducedMotion, BOOL)
RCT_EXPORT_VIEW_PROPERTY(durationMs, double)
RCT_EXPORT_VIEW_PROPERTY(entrance, NSDictionary)
@end

@interface RCT_EXTERN_MODULE(SkynetFeedbackManager, RCTViewManager)
RCT_EXPORT_VIEW_PROPERTY(target, NSDictionary)
RCT_EXPORT_VIEW_PROPERTY(reducedMotion, BOOL)
RCT_EXPORT_VIEW_PROPERTY(durationMs, double)
@end

@interface RCT_EXTERN_MODULE(SkynetIconManager, RCTViewManager)
RCT_EXPORT_VIEW_PROPERTY(symbol, NSString)
RCT_EXPORT_VIEW_PROPERTY(tint, NSString)
@end
