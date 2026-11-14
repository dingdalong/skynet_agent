#import <React/RCTImageURLLoader.h>

// Keep SF Symbols on RN's standard Fabric Image layout and animation path.
@interface SkynetSymbolLoader : NSObject <RCTImageURLLoader>
@end

@implementation SkynetSymbolLoader
RCT_EXPORT_MODULE()

+ (BOOL)requiresMainQueueSetup
{
    return NO;
}

- (BOOL)canLoadImageURL:(NSURL *)url
{
    return [url.scheme isEqualToString:@"skynet-symbol"];
}

- (BOOL)requiresScheduling
{
    return NO;
}

- (RCTImageLoaderCancellationBlock)loadImageForURL:(NSURL *)url
                                            size:(CGSize)size
                                           scale:(CGFloat)scale
                                      resizeMode:(RCTResizeMode)resizeMode
                                 progressHandler:(RCTImageLoaderProgressBlock)progressHandler
                              partialLoadHandler:(RCTImageLoaderPartialLoadBlock)partialLoadHandler
                   completionHandlerWithMetadata:(RCTImageLoaderCompletionBlockWithMetadata)completion
{
    UIImageSymbolConfiguration *configuration =
        [UIImageSymbolConfiguration configurationWithPointSize:MAX(20, MAX(size.width, size.height))
                                                       weight:UIImageSymbolWeightRegular];
    UIImage *image = [UIImage systemImageNamed:url.host withConfiguration:configuration];
    NSError *error = image ? nil : [NSError errorWithDomain:@"SkynetSymbol" code:1
                                                  userInfo:@{NSLocalizedDescriptionKey: @"Unknown system symbol"}];
    completion(error, image, nil);
    return ^{};
}

- (RCTImageLoaderCancellationBlock)loadImageForURL:(NSURL *)url
                                            size:(CGSize)size
                                           scale:(CGFloat)scale
                                      resizeMode:(RCTResizeMode)resizeMode
                                 progressHandler:(RCTImageLoaderProgressBlock)progressHandler
                              partialLoadHandler:(RCTImageLoaderPartialLoadBlock)partialLoadHandler
                               completionHandler:(RCTImageLoaderCompletionBlock)completion
{
    return [self loadImageForURL:url size:size scale:scale resizeMode:resizeMode
                progressHandler:progressHandler partialLoadHandler:partialLoadHandler
   completionHandlerWithMetadata:^(NSError *error, UIImage *image, id metadata) {
        completion(error, image);
    }];
}

@end
