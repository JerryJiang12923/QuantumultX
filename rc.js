const pyer1 = {};
const pyer2 = JSON.parse(typeof $response !== "undefined" && $response.body || null);

// 读取配置
const uaPatterns = $persistentStore.read("chrequest") ? $persistentStore.read("chrequest").split(",").map(ua => ua.trim().toLowerCase()) : [];
const names = $persistentStore.read("chname") ? $persistentStore.read("chname").split(",").map(name => name.trim()) : [];
const appids = $persistentStore.read("chappid") ? $persistentStore.read("chappid").split(",").map(id => id.trim()) : [];
const forever = JSON.parse($persistentStore.read("forever"));

// 确保配置长度一致（取最小长度）
const minLength = Math.min(uaPatterns.length, names.length, appids.length);
const validUA = uaPatterns.slice(0, minLength);
const validNames = names.slice(0, minLength);
const validAppids = appids.slice(0, minLength);

// 核心逻辑
if (typeof $response === "undefined") {
  // 请求阶段：检测 UA 并删除 ETag
  const userAgent = ($request.headers["User-Agent"] || "").toLowerCase();
  const shouldProcess = validUA.some(ua => userAgent.includes(ua));

  if (shouldProcess) {
    delete $request.headers["x-revenuecat-etag"];
    delete $request.headers["X-RevenueCat-ETag"];
    pyer1.headers = $request.headers;
  }
  $done(pyer1);

} else if (pyer2?.subscriber) {
  // 响应阶段：匹配 UA 并修改订阅数据
  const userAgent = ($request.headers["User-Agent"] || "").toLowerCase();
  const matchedIndices = [];
  
  for (let i = 0; i < validUA.length; i++) {
    if (userAgent.includes(validUA[i])) {
      matchedIndices.push(i);
    }
  }

  if (matchedIndices.length === 0) {
    $done({}); // 不匹配则返回原始响应
    return;
  }

  // 初始化数据结构
  pyer2.subscriber.subscriptions ||= {};
  pyer2.subscriber.entitlements ||= {};

  // 仅处理匹配的条目
  for (const index of matchedIndices) {
    const name = validNames[index];
    const appid = validAppids[index];
    
    const data = {
      product_identifier: appid,
      purchase_date: "2024-09-09T09:09:09Z"
    };

    if (!forever) {
      data.expires_date = "2099-09-09T09:09:09Z";
    }

    // 更新权益数据
    pyer2.subscriber.entitlements[name] = data;
    
    // 更新订阅数据
    pyer2.subscriber.subscriptions[appid] = {
      ...data,
      original_purchase_date: "2024-09-09T09:09:09Z",
      store: "app_store",
      ownership_type: "PURCHASED",
      period_type: "normal"
    };
  }

  pyer1.body = JSON.stringify(pyer2);
  $done(pyer1);
}
