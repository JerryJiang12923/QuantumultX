const pyer1 = {};

// 安全解析响应体
let pyer2;
try {
  pyer2 = JSON.parse(typeof $response !== "undefined" && $response.body || null);
} catch (e) {
  console.log(`[Error] 解析响应失败: ${e.message}`);
  $done({});
  return;
}

// 读取配置
const uaPatterns = $persistentStore.read("chrequest")?.split(",").map(ua => ua.trim().toLowerCase()) || [];
const names = $persistentStore.read("chname")?.split(",").map(name => name.trim()) || [];
const appids = $persistentStore.read("chappid")?.split(",").map(id => id.trim()) || [];
const forever = JSON.parse($persistentStore.read("forever") || "false");

// 对齐配置长度
const minLength = Math.min(uaPatterns.length, names.length, appids.length);
const validUA = uaPatterns.slice(0, minLength);
const validNames = names.slice(0, minLength);
const validAppids = appids.slice(0, minLength);

// 请求阶段处理
if (typeof $response === "undefined") {
  const userAgent = ($request.headers["User-Agent"] || "").toLowerCase();
  if (validUA.some(ua => userAgent.includes(ua))) {
    delete $request.headers["x-revenuecat-etag"];
    delete $request.headers["X-RevenueCat-ETag"];
    pyer1.headers = $request.headers;
  }
  $done(pyer1);
} else if (pyer2?.subscriber) {
  const userAgent = ($request.headers["User-Agent"] || "").toLowerCase();
  const matchedIndices = [];
  
  // 快速匹配逻辑（最多10条）
  for (let i = 0; i < validUA.length && matchedIndices.length < 10; i++) {
    if (userAgent.includes(validUA[i])) {
      matchedIndices.push(i);
    }
  }

  if (matchedIndices.length === 0) {
    $done({});
    return;
  }

  // 批量初始化订阅数据
  pyer2.subscriber = {
    ...pyer2.subscriber,
    subscriptions: pyer2.subscriber.subscriptions || {},
    entitlements: pyer2.subscriber.entitlements || {}
  };

  // 快速生成订阅模板
  const baseData = {
    purchase_date: "2024-09-09T09:09:09Z",
    ...(!forever && { expires_date: "2099-09-09T09:09:09Z" })
  };

  // 批量更新数据
  matchedIndices.forEach(index => {
    const name = validNames[index];
    const appid = validAppids[index];
    
    pyer2.subscriber.entitlements[name] = { 
      product_identifier: appid,
      ...baseData
    };
    
    pyer2.subscriber.subscriptions[appid] = {
      product_identifier: appid,
      ...baseData,
      original_purchase_date: "2024-09-09T09:09:09Z",
      store: "app_store",
      ownership_type: "PURCHASED",
      period_type: "normal"
    };
  });

  pyer1.body = JSON.stringify(pyer2);
  $done(pyer1);
}
