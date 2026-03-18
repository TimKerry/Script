/*
Spotify Premium + Remove Ads
Optimized for Surge
*/

if ($response.status != 200) {
  $done({});
  return;
}

let body = $response.body;

try {

  let obj = JSON.parse(body);

  if (obj && obj.accountAttributes) {

    /* 保留 Premium */
    obj.accountAttributes["type"] = { "stringValue": "premium" };
    obj.accountAttributes["player-license"] = { "stringValue": "premium" };
    obj.accountAttributes["financial-product"] = { "stringValue": "pr:premium,tc:0" };
    obj.accountAttributes["name"] = { "stringValue": "Spotify Premium" };

    /* 关闭广告 */
    obj.accountAttributes["ads"] = { "boolValue": false };

  }

  /* 关闭分享活动 */
  if (obj && obj.resolveSuccess && obj.resolveSuccess.configuration) {

    let assigned = obj.resolveSuccess.configuration.assignedValues;

    if (Array.isArray(assigned)) {

      assigned.forEach(item => {

        if (item?.propertyId?.name === "is_useractivity_sharing_enabled") {
          item.boolValue = { value: false };
        }

        if (item?.propertyId?.name === "is_row_enabled") {
          item.boolValue = { value: false };
        }

      });

    }

  }

  $done({ body: JSON.stringify(obj) });

} catch (e) {

  console.log("Spotify Script Error:", e);
  $done({});

}
