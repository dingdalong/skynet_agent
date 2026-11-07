use block2::RcBlock;
use objc2::{rc::Retained, runtime::AnyObject, MainThreadMarker};
use objc2_app_kit::{
    NSMenu, NSMenuDidAddItemNotification, NSMenuDidBeginTrackingNotification,
    NSUserInterfaceItemIdentification,
};
use objc2_foundation::{NSNotification, NSNotificationCenter};
use std::{ptr::NonNull, sync::Mutex};

// WebKit 的 WebMenuItemTagReload，按动作类型匹配以避开菜单本地化。
const RELOAD_MENU_ITEM_TAG: isize = 12;

// Observer 只在主线程安装和释放；跨线程状态仅保存不解引用的所有权句柄。
pub struct MenuFilter {
    observers: Mutex<Vec<usize>>,
}
impl MenuFilter {
    pub fn install() -> Self {
        MainThreadMarker::new().expect("原生菜单必须在主线程初始化");
        let center = NSNotificationCenter::defaultCenter();
        let callback = RcBlock::new(|notification: NonNull<NSNotification>| {
            if MainThreadMarker::new().is_none() {
                return;
            }
            let notification = unsafe { notification.as_ref() };
            let Some(object) = notification.object() else {
                return;
            };
            let Some(menu) = object.downcast_ref::<NSMenu>() else {
                return;
            };
            for item in menu.itemArray().iter() {
                let identified = item
                    .identifier()
                    .is_some_and(|id| id.to_string() == "WKMenuItemIdentifierReload");
                // WebKit 兼容菜单有时没有 identifier，使用其 Reload 动作标记并校验菜单分发入口。
                let reload_action = item.tag() == RELOAD_MENU_ITEM_TAG
                    && item.action().is_some_and(|action| {
                        action.name().to_bytes() == b"forwardContextMenuAction:"
                    });
                if (identified || reload_action) && !item.isHidden() {
                    item.setHidden(true);
                }
            }
        });
        let observers = [unsafe { NSMenuDidAddItemNotification }, unsafe {
            NSMenuDidBeginTrackingNotification
        }]
        .into_iter()
        .map(|name| {
            let observer = unsafe {
                center.addObserverForName_object_queue_usingBlock(Some(name), None, None, &callback)
            };
            Retained::into_raw(observer) as *mut AnyObject as usize
        })
        .collect();
        eprintln!("[platform] init macOS 原生菜单重载项过滤已启用");
        Self {
            observers: Mutex::new(observers),
        }
    }
    pub fn stop(&self) {
        MainThreadMarker::new().expect("原生菜单必须在主线程释放");
        let center = NSNotificationCenter::defaultCenter();
        for observer in self.observers.lock().unwrap().drain(..) {
            // 取回 install 转移的唯一 Retained 所有权，先注销再释放。
            let observer =
                unsafe { Retained::<AnyObject>::from_raw(observer as *mut AnyObject) }.unwrap();
            unsafe { center.removeObserver(&observer) };
        }
    }
}
