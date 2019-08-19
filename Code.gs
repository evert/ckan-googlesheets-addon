var SIDEBAR_TITLE = 'CKAN Data Explorer';
var CACHE_PERIOD = 300; // cache for 5 minutes

/**
 * Adds a custom menu with items to show the sidebar
 *
 * @param {Object} e The event parameter for a simple onOpen trigger.
 */
function onOpen(e) {
  SpreadsheetApp.getUi()
  .createAddonMenu()
  .addItem('Open', 'showSidebar')
  .addToUi();
}

/**
 * Show the side bar
 */
function showSidebar() {
  var ui = HtmlService.createTemplateFromFile('Sidebar')
      .evaluate()
      .setTitle(SIDEBAR_TITLE)
      .setSandboxMode(HtmlService.SandboxMode.IFRAME);
  SpreadsheetApp.getUi().showSidebar(ui);
  
}

/**
 * Returns the list of package ids with a given provider url
 * TODO: map provider to url. Currently we only have the correct url for city of Toronto
 *
 * @param {String} providerUrl
 * @returns {String[]} 
 */
function getPackageList(providerUrl) {
  providerUrl = 'https://ckan0.cf.opendata.inter.sandbox-toronto.ca/api/3';
  var url = providerUrl + '/action/package_list';
  var response = UrlFetchApp.fetch(url).getContentText();
  return JSON.parse(response).result;
}

/**
 * Returns the data set with the description and list of data belong to the package
 * @param {Object} provider The provider contains the name and url
 * @param {String} packageId Unique identifier for the package
 * @returns {Object} packageContent
 */
function getDataSet(provider, packageId) {
  // TODO: provider data with url and name should be provided by CKAN instances or when user add a provider
  provider = {
    url:'https://ckan0.cf.opendata.inter.prod-toronto.ca/api/3',
    name: 'city-of-toronto'
  };
  // Reduce the number of times we need to fetch data by using the cache service
  // Ref: https://developers.google.com/apps-script/guides/support/best-practices
  var cache = CacheService.getScriptCache();
  var cachedPackageId = provider.name + '-' + packageId;
  var cachedPackageContent = cache.get(cachedPackageId);
  if (cachedPackageContent != null) {
    return JSON.parse(cachedPackageContent).result;
  }

  var url = provider.url + '/action/package_show?id=' + packageId;
  var response = UrlFetchApp.fetch(url).getContentText();
  cache.put(cachedPackageId, response, CACHE_PERIOD);
  return JSON.parse(response).result;
}  
  
/**
 * Import all the data with CSV format, create a new sheet for each data set
 * @param {Object} provider The provider contains the name and url
 * @param {String} packageId Unique identifier for the package
 */
function showDataSet(provider, packageId) {
  provider = {
    url:'https://ckan0.cf.opendata.inter.prod-toronto.ca/api/3',
    name: 'city-of-toronto'
  };
   var packageResources = getDataSet(provider, packageId).resources;
  var spreadsheet = null;
  for (var i = 0; i < packageResources.length; i++) {
    // TODO: Deal with non CSV packages
    if (packageResources[i].format == 'CSV') {
      // create a new spreadsheet with the data name
      spreadsheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet(packageResources[i].name);
      importCSVFromWeb(spreadsheet, packageResources[i].url);
    }
  }
}

/**
 * Load into the spreadsheet with provided full URL of the CSV file
 * @param {Object} spreadsheet
 * @param {String} csvUrl
 */
function importCSVFromWeb(spreadsheet, csvUrl) {
  var csvContent = UrlFetchApp.fetch(csvUrl).getContentText();
  var csvData = Utilities.parseCsv(csvContent);
  //spreadsheet = SpreadsheetApp.getActiveSheet();
  spreadsheet.getRange(1, 1, csvData.length, csvData[0].length).setValues(csvData);
}

