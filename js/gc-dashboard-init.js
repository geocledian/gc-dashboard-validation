/*
 Vue.js Geocledian Data Validation Dashboard
 
 init script
 
 created: 2021-10-20, pal
 updated: 2022-04-22, jsommer
 version: 0.5.1
*/

// root Vue instance
var vmRoot;

// global gc locale object
// every component may append its data to this
var gcLocales = { en: {
  "total": "Total parcels",
  "valid": "valid",
  "invalid": "invalid",
  "error": "error",
  "rules": {
    "homogeneity": "Homogeneity"
  },
}, de: {
  "total": "Anzahl Felder",
  "valid": "gültig",
  "invalid": "ungültig",
  "error": "fehlerhaft",
  "rules": {
    "homogeneity": "Homogenität"
  },
} };

// global i18n object
var i18n;

// init dependent javascript libs
const libs = ['https://unpkg.com/vue@2.6.14/dist/vue.min.js',
              'https://unpkg.com/vue-i18n@8.17.5/dist/vue-i18n.js',
              'https://unpkg.com/split.js@1.6.0/dist/split.min.js',
              'https://cdnjs.cloudflare.com/ajax/libs/axios/0.19.2/axios.min.js',
              // 'https://cdnjs.cloudflare.com/ajax/libs/jquery/3.6.0/jquery.min.js',
              '../gc-styles/bulma/0.6.2/bulma-ext/bulma-calendar/v1/bulma-calendar.min.js',
              '../gc-chart/js/d3.v6.min.js', // v6.7.0
              '../gc-chart/js/billboard.min.js', // v3.1.5
              '../gc-filter/js/gc-filter.js',
              'js/gc-validation-list.js',
            ];

function gcGetBaseURL() {
    //get the base URL relative to the current script - regardless from where it was called
    // js files are loaded relative to the page
    // css files are loaded relative to its file
    let scriptURL = document.getElementById("gc-dashboard-init");
    let url = new URL(scriptURL.src);
    let basename = url.pathname.substring(url.pathname.lastIndexOf('/')+1);
    return url.href.split('/js/'+basename)[0];
}

function loadJSscriptDeps(url_list, final_callback) {
    /* 
      loads dependent javascript libraries async but in order as given in the url_list. 
      thanks to 
      https://stackoverflow.com/questions/7718935/load-scripts-asynchronously
    */
    function scriptExists(url_to_check) {
      
      let found = false;

      for (var i=0; i< document.head.children.length; i++) {
        const script = document.head.children[i];
        
        // only scripts or links (css) are of interest
        if (!["SCRIPT","LINK"].includes(script.tagName))  { continue; }

        if (script.src === url_to_check) {
          found = true;
          //console.error("Script already loaded: "+ url_to_check)
          break;
        }
      }
      return found;
    }
    function loadNext() {
      //console.debug("length of URLs: "+ url_list.length);
      if (!url_list.length) { 
        console.debug("READY loading dependent libs"); 
        final_callback(); 
      }
  
      let url = url_list.shift();
      //console.debug("current URL: "+ url);

      if (url && !url.includes('http')) {
        url = gcGetBaseURL() + "/" +url;
        console.debug('loadNext()');
        console.debug(url);
      }

      // check google URL for valid key
      if (url && url.includes("YOUR_VALID_API_KEY_FROM_GOOGLE")) { 
        console.error("Change the Google Maps API Key!"); 
        return;
      }

      // prevent multiple loading of same script urls
      if (url && !scriptExists(url)) { 
        let script = document.createElement("script");  // create a script DOM node
        script.type = 'text/javascript';
        script.src = url;  // set its src to the provided URL
        script.async = true;
        // if ready, load the next on in queue
        script.onload = script.onreadystatechange = function () {
          loadNext();
        };
        // add it to the end of the head section of the page (could change 'head' to 'body' to add it to the end of the body section instead)
        document.head.appendChild(script); 
      }
      else { console.warn("URL already loaded - skipping: "+ url); }
    }
    //first call
    loadNext();

}
function initComponent() {
    /* 
      inits component
    */
    i18n = new VueI18n({
      locale: 'en', // set locale
      fallbackLocale: 'en',
      messages: gcLocales, // set locale messages
    })

    // bind index locales to global locales
    gcLocales.de.indexLocales = indexLocales.de;
    gcLocales.en.indexLocales = indexLocales.en;

    /* when ready, init global vue root instance */
    vmRoot = new Vue({
      el: "#gc-app",
      data: {
        chart: undefined,
        parcels: [],
        centroids: [],
        jsonresult: [],
        pid: [],
        hval: [],
        currentParcelId: -1,
        valueX: ["True", "False", "Error"],
        valueY: [],
        fromDate:"",
        toDate:"",
        truecount:0,
        falsecount:0,
        errorcount:0,
        truepercent:0,
        falsepercent:0,
        errorpercent:0,    
        selectedParcelIds: [],
        visibleParcelIds: [], 
        dataSource: "",
        filterString: "",
        limit: 250, //maximum for now because of parcel endpoint used with &detail=true switch!
        offset: 0,
        language: "en",
        listActive: true,
        isloading: false, // for showing / hiding spinner
        apiSecure: true // HTTPS or HTTP requests
      },
      i18n: i18n,
      created() {
        console.debug("gc-validation-dashboard-init created!");
        this.selectedParcelId = this.gcParcelId;
        i18n.locale = this.language;
        //i18n for index page
        this.setLocaleForIndexPage();   
        //adds the query parameters of the current app to the link of each other app 
        this.addQueryParamsForNewApp();
      },
      mounted: function () {
        console.debug("root mounted!");
    
        //set up listener for changes from child components
        this.$on('filterStringChange', this.filterStringChange);
        this.$on('limitChange', this.limitChange);
        this.$on('offsetChange', this.offsetChange);
        this.$on('dataSourceChange', this.dataSourceChange);   
        this.$on('currentParcelIdChange', this.currentParcelIdChange);   

        // trigger apply filter
        for (var i=0; i < this.$children.length; i++ ) {
          if (this.$children[i].gcWidgetId.includes("filter")) {
            this.$children[i].applyFilter();
            break;
          } 
        }

        // init date pickers
        this.startdateCalendar = new bulmaCalendar( document.getElementById( 'fromDate' ), {
          startDate: new Date(), // Date selected by default
          dateFormat: 'yyyy-mm-dd', // the date format `field` value
          lang: this.language, // internationalization
          overlay: false,
          closeOnOverlayClick: true,
          closeOnSelect: true,
          // callback functions
          onSelect: function (e) { 
                      // hack +1 day
                      var a = new Date(e.valueOf() + 1000*3600*24);
                      this.fromDate = a.toISOString().split("T")[0]; //ISO String splits at T between date and time
                      }.bind(this),
        });
        this.enddateCalendar = new bulmaCalendar( document.getElementById( 'toDate' ), {
          startDate: new Date(), // Date selected by default
          dateFormat: 'yyyy-mm-dd', // the date format `field` value
          lang: this.language, // internationalization
          overlay: false,
          closeOnOverlayClick: true,
          closeOnSelect: true,
          // callback functions
          onSelect: function (e) { 
                      // hack +1 day
                      var a = new Date(e.valueOf() + 1000*3600*24);
                      this.toDate = a.toISOString().split("T")[0]; //ISO String splits at T between date and time
                      }.bind(this),
        });
      },
      watch: {
        filterString: function(newValue, oldValue) {
          console.debug("root filterString changed!");
          this.getParceldata();
        },
        language (newValue, oldValue) {
          i18n.locale = newValue;
          //i18n for index page
          this.setLocaleForIndexPage();

          //recreate Chart
          if (this.chart) {
            this.chart.destroy();
          }
          this.createChart();
        },
      },
      computed: {
        gcApikey: {
          get: function() {
            console.debug("API key!");
            //let key = this.getQueryVariable(this.defaultUrl, "key");
            let key = this.getQueryVariable(window.location.search.substring(1), "key");
            
            console.debug(" key!" +key);
             return (key ? key : '39553fb7-7f6f-4945-9b84-a4c8745bdbec');        
          }
        },
        gcHost: {
          get: function() {
            let host = this.getQueryVariable(window.location.search.substring(1), "host");
            //let host = this.getQueryVariable(this.defaultUrl, "host");
            return (host ? host : 'geocledian.com');
          }
        },
        gcParcelId: {
          get: function() {
            let parcel_id = parseInt(this.getQueryVariable(window.location.search.substring(1), "parcel_id"));
            //let parcel_id = parseInt(this.getQueryVariable(this.defaultUrl, "parcel_id"));
            console.debug("root - gcParcelId: " +this.parcel_id);
            return parcel_id;
          }
        },
        apiBaseUrl: {
          get() {
            return "/agknow/api/v4"
          }
        },
        apiKey: {
          get() {
            return this.gcApikey;
          }
        }
      },
      methods: {
        /* events for listening on child events */
        filterStringChange: function (filterString) {
          this.filterString = filterString;
        },   
        limitChange: function (limit) {
          this.limit = limit;
        },
        offsetChange: function (offset) {
          this.offset = offset;
        },
        dataSourceChange: function (source) {
          this.dataSource = source;
        },
        currentParcelIdChange: function (value) {
          this.currentParcelId = value;
        },
        getApiUrl: function (endpoint, request_method) {
          /* handles requests directly against  geocledian endpoints with API keys
              or (if gcProxy is set)
            also requests against the URL of gcProxy prop without API-Key; then
            the proxy or that URL has to add the api key to the requests against geocledian endpoints
          */
          let protocol = 'http';
    
          if (this.apiSecure) {
            protocol += 's';
          }
    
          // if (this.apiEncodeParams) {
          //   endpoint = encodeURIComponent(endpoint);
          // }
          
          if (request_method === "POST") {
            // omit API KEY on POST; it should be already inside the JSON Payload
            // if the API is passed as query parameter in the URL, API will fail with "key is not authorized!"
            return (this.gcProxy ? 
              protocol + '://' + this.gcProxy + this.apiBaseUrl + endpoint  : 
              protocol + '://' + this.gcHost + this.apiBaseUrl + endpoint);
          }
          else {
            // with or without apikey depending on gcProxy property
            return (this.gcProxy ? 
                      protocol + '://' + this.gcProxy + this.apiBaseUrl + endpoint  : 
                      protocol + '://' + this.gcHost + this.apiBaseUrl + endpoint + "?key="+this.apiKey);
          }
        },
        getParceldata: function(){
          console.debug("getParceldata()")
          // when we add &detail=true to the request we get planting & harvest date from the API with one call
          // but this is limited to 250 parcels on the server side;
          // then we can show start/end date for each parcel in the list
          const endpoint = "/parcels";
          let params = "" + this.filterString + "&limit=" + this.limit +"&detail=true";
          let url;

          console.debug("getParcelData()");
          url = this.getApiUrl(endpoint) + params;
          console.debug("GET " + url);

          // clear data
          this.parcels = [];
          this.truecount = 0;
          this.truepercent = 0;
          this.falsecount = 0;
          this.falsepercent = 0;
          this.errorcount = 0;
          this.errorpercent = 0;

          // also empty chart
          if (this.chart) {
            this.chart.destroy();
          }

          axios({
            method: 'GET',
            url: url,
          }).then(function (response) {
            if(response.status === 200){
              var tmp = response.data;

              console.debug(tmp);
    
              if (tmp.content.length > 0) {
                this.parcels = tmp.content;
                // fill analytics control
                // minimum planting over all parcels
                this.fromDate = this.parcels.map(p=>p.planting).sort()[0];
                // maximum harvest over all parcels
                this.toDate = this.parcels.map(p=>p.harvest).sort()[this.parcels.length-1];
              }
            }
          }.bind(this)).catch(err => {
            console.log("err= " + err);
          })
          
          // $.getJSON(url, function(data) {
          //   console.debug(data);
          //   this.parcels = data.content; 
          //   // this.currentParcelId = data.content.parcel_id;   
          //   this.getHomogeneitydata(this.fromDate,this.toDate);
          // }.bind(this) 
          // ); 
        },
        getHomogeneitydata: function(){

          console.debug("getHomogeneitydata()")

          let fromDate = this.fromDate;
          let toDate = this.toDate;

          // show spinner
          this.isloading = true;

          //console.debug("getHomogeneityData(init)" +this.parcels.length); 
          // document.getElementById("totalparcels").innerHTML =  "Total Parcels : " + this.parcels.length;

          this.truecount = 0;this.falsecount= 0;this.errorcount = 0;
          this.truepercent = 0;this.falsepercent = 0;this.errorpercent = 0;

          // holds all promises objects of axios
          // needed because of async get requests inside the for loop
          let promises = [];

          for (let i = 0; i < this.parcels.length; i++) {
            let params;
            const endpoint = "/parcels/" + this.parcels[i].parcel_id + "/homogeneity";
            let url;

            if(fromDate === "" && toDate === ""){
              params = "";
            }
            else{
              params = "&startdate=" + fromDate + "&enddate=" + toDate;
            }

            // get overall url
            url = this.getApiUrl(endpoint) + params;
            console.debug("GET " + url);

            // use Vue set for former unknown keys in JSON Objects!
            Vue.set(this.parcels[i], "homogeneity", 'error')
            // this.parcels[i].homogeneity = "error";

            // collect all promises of axios
            promises.push(
              axios({
                method: 'GET',
                url: url,
              }).then(function (response) {
                if(response.status === 200){
                  var tmp = response.data;
    
                  console.debug(tmp);
        
                  // use Vue set for former unknown keys in JSON Objects!
                  Vue.set(this.parcels[i], "homogeneity", tmp.content.homogeneity + '') // convert bool to string!
                  // this.parcels[i].homogeneity = tmp.content;  
              
                  if(this.parcels[i].homogeneity==='true')
                  {
                    this.truecount = this.truecount + 1;
                    this.truepercent = ((this.truecount/this.parcels.length)*100).toFixed(2);
                  }
                  if(this.parcels[i].homogeneity==='false')
                  {
                    this.falsecount = this.falsecount + 1;
                    this.falsepercent = ((this.falsecount/this.parcels.length)*100).toFixed(2);
                  }
                  this.errorcount = this.parcels.length - this.truecount  - this.falsecount;
                  this.errorpercent = ((this.errorcount/this.parcels.length)*100).toFixed(2);

                  this.valueY = [this.truepercent,this.falsepercent,this.errorpercent];
                  console.debug("total false count :" +this.valueY);

                  // don't create chart on every update of a parcel but at the end
                  // this.createChart();
                }
              }.bind(this)).catch(err => {
                console.log("err= " + err);
              })
            );

            // $.getJSON(url, function(data) {
            //   //console.debug(data);
            //   this.homogeneity = data.content;    
            //   this.parcels[i].homogeneity =  this.homogeneity["homogeneity"];               
            //   if(this.parcels[i].homogeneity==true)
            //   {
            //     this.truecount = this.truecount + 1;
            //     this.truepercent = ((this.truecount/this.parcels.length)*100).toFixed(2);
            //   }
            //   if(this.parcels[i].homogeneity==false)
            //   {
            //     this.falsecount = this.falsecount + 1;
            //     this.falsepercent = ((this.falsecount/this.parcels.length)*100).toFixed(2);
            //   }
            //   this.errorcount = this.parcels.length - this.truecount  - this.falsecount;
            //   this.errorpercent = ((this.errorcount/this.parcels.length)*100).toFixed(2);

            //   // document.getElementById("truecount").innerHTML = "True : " + this.truecount;
            //   // document.getElementById("falsecount").innerHTML = "False : " + this.falsecount;
            //   // document.getElementById("errorcount").innerHTML = "Error : " + this.errorcount;

            //   // document.getElementById("truepercent").innerHTML = "True % : " + this.truepercent;
            //   // document.getElementById("falsepercent").innerHTML = "False % : " +this.falsepercent;
            //   // document.getElementById("errorpercent").innerHTML = "Error % : " + this.errorpercent;

            //   this.valueY = [this.truepercent,this.falsepercent,this.errorpercent];
            //   console.debug("total false count :" +this.valueY);
              
            //   this.createChart();

            //   // this.$forceUpdate();
            // }.bind(this)); 
          }
          
          // will be executed when all promises of the axios promise objects are ready
          Promise.all(promises).then(() => this.createChart());

        },
        createChart: function(){

          console.debug("BB Chart");

          this.chart = bb.generate({
            data: {
              columns: [],
              type: "donut", // for ESM specify as: donut()
              colors: {"valid": '#32CD32', "invalid": "red", "error": "#F6BE00" },
              names: {
                "valid": this.$t('valid'),
                "invalid": this.$t('invalid'),
                "error": this.$t('error')
              }  
            },
            legend: {
              padding: 32 // better legend viz when handling with v-show
            },
            bindto: "#Chart"
          });

          
          this.chart.load({
            columns: [
              ["valid", this.truepercent],
              ["invalid", this.falsepercent],
              ["error", this.errorpercent],
            ],
            done: function() {   
              // hide spinner after data is loaded
              this.isloading = false;
            }.bind(this)
          });

        },
        //https://stackoverflow.com/questions/2090551/parse-query-string-in-javascript
        getQueryVariable: function (query, variable) {          
          var vars = query.split('&');
          for (var i = 0; i < vars.length; i++) {
              var pair = vars[i].split('=');
              if (decodeURIComponent(pair[0]) == variable) {
                  return decodeURIComponent(pair[1]);
              }
          }
          console.log('Query variable %s not found', variable);
        },
        getAnalystsDashboardLink: function () {
          /* returns a dynamic link to the Analyst's Dashboard */
    
          let apiKey = "";
          let host = "";
          if (this.gcApikey) {
            apiKey = this.gcApikey;
          }
          if (this.gcHost) {
            host = this.gcHost;
          }
          return "https://geocledian.com/agclient/analyst/?key="+apiKey + "&host=" +host;
        },
        setLocaleForIndexPage() {
          /* translate navbar elements */
          document.getElementById("navbarProductOverview").innerHTML = i18n.t("indexLocales.navbar.productOverview")
          document.getElementById("navbarAboutUs").innerHTML = i18n.t("indexLocales.navbar.about");
          document.getElementById("allRightsReserved").innerHTML = i18n.t("indexLocales.footer.allRightsReserved");

          document.getElementById("navbarCropPerformance").innerHTML = i18n.t("indexLocales.navbar.cropPerformance");
          document.getElementById("navbarHarvest").innerHTML = i18n.t("indexLocales.navbar.harvest");
          document.getElementById("navbarPortfolio").innerHTML = i18n.t("indexLocales.navbar.portfolio");
          document.getElementById("navbarZones").innerHTML = i18n.t("indexLocales.navbar.zones");
          document.getElementById("navbarAnalyst").innerHTML = i18n.t("indexLocales.navbar.analyst");

          // document.getElementById("menuUtilities").innerHTML = i18n.t("indexLocales.headings.utilities");
          document.getElementById("menuSearch").innerHTML = i18n.t("indexLocales.headings.filter");
          document.getElementById("menuRules").innerHTML = i18n.t("indexLocales.headings.rules");
          document.getElementById("menuSummary").innerHTML = i18n.t("indexLocales.headings.summary");
          // document.getElementById("menuFields").innerHTML = i18n.t("indexLocales.headings.fields");
          document.getElementById("menuAnalytics").innerHTML = i18n.t("indexLocales.headings.analytics");
        },
        addQueryParamsForNewApp() {
          /* adds the query parameters of the current app to the link of each other app */
          let queryParams = window.location.search.substring(1);
          console.debug("QUERY PARAMS: " + queryParams);

          document.getElementById("navbarCropPerformance").href += "?" + queryParams;
          document.getElementById("navbarPortfolio").href += "?" + queryParams;
          document.getElementById("navbarZones").href += "?" + queryParams;
          document.getElementById("navbarHarvest").href += "?" + queryParams;
          document.getElementById("navbarAnalyst").href += "?" + queryParams;

        }
      }
    });
}
function loadJSscript (url, callback) {
    /* 
      loads javascript library async and appends it to the DOM
      */
    let script = document.createElement("script");  // create a script DOM node
    script.type = 'text/javascript';
    script.src = gcGetBaseURL() + "/"+ url;  // set its src to the provided URL
    script.async = true;
    document.head.appendChild(script);  // add it to the end of the head section of the page
    //if ready, call the callback function 
    script.onload = script.onreadystatechanged = function () {
      if (callback) { callback(); }
    };
}

// async loading dependencies and init the component
loadJSscriptDeps(libs, initComponent);   


Date.prototype.simpleDate = function () {
  var a = this.getFullYear(),
      b = this.getMonth() + 1,
      c = this.getDate();
  return a + "-" + (1 === b.toString().length ? "0" + b : b) + "-" + (1 === c.toString().length ? "0" + c : c)
}
