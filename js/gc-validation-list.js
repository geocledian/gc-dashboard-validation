/*
 Vue.js Geocledian validation list component
 created: 2021-10-15, pal
 updated: 2021-11-30, jsommer
 version: 0.5.0
*/
"use strict";

// surpress vue warnings
Vue.config.silent = true;

//lanugage strings
const gcListLocales = {
  "en": {
    "options": { "title": "Parcel list" },
    "fields": { 
      "id": "id",
      "crop": "crop",
      "entity": "entity",
      "name": "name",
      "planting": "seeding",
      "harvest": "harvest",
      "area": "area",
      "homogeneity": "result"
    },
    "buttons": { "fieldAnalysis" : {"title": "Detail view"}}
  },
  "de": {
    "options": { "title": "Flächenliste"},
    "fields": { 
      "id": "nr",
      "crop": "fruchtart",
      "entity": "entität",
      "name": "name",
      "planting": "pflanzung",
      "harvest": "ernte",
      "area": "fläche",
      "homogeneity": "ergebnis"
    },
    "buttons": { "fieldAnalysis" : {"title": "Detailansicht"}}
  },
}

Vue.component('gc-list', {
  props: {
    gcWidgetId: {
      type: String,
      default: 'list1',
      required: true
    },
    gcApikey: {
      type: String,
      default: '385f8b37-659a-4aa1-b1a5-f46c46d2858d'//'39553fb7-7f6f-4945-9b84-a4c8745bdbec'
    },
    gcHost: {
      type: String,
      default: 'geocledian.com'
    },
    gcProxy: {
      type: String,
      default: undefined
    },
    gcParcels: { 
      type: Array, 
      default: []
    },
    gcVisibleParcelIds: {      
      type: String,
      default: ''
    },
    gcCurrentParcelId: {      
      type: String,
      default: ''
    },
    gcAvailableFields: {
      type: String,
      default: 'parcelId,name,crop,entity,planting,harvest,area,homogeneity,fieldAnalysis,result'
    },
    // gcFieldAnalysisLink: {
    //   type: String,
    //   default: undefined
    // },
    gcAvailableOptions: {
      type: String,
      default: 'widgetTitle'
    },
    gcWidgetCollapsed: {
      type: Boolean,
      default: true // or false
    },
    gcLanguage: {
      type: String,
      default: 'de' // 'en' | 'de' | 'lt'
    }
  },
  template: `<div :id="this.gcWidgetId" class="is-inline">
              <p class="gc-options-title is-size-6 is-orange is-inline-block" 
                  style="cursor: pointer; margin-bottom: 1em;"  
                  v-on:click="toggleListOptions"
                  v-show="availableOptions.includes('widgetTitle')">
               {{ $t('options.title')}}
               <i :class="[gcWidgetCollapsed ? '': 'is-active', 'fas', 'fa-angle-down', 'fa-sm']"></i>
              </p>
              <div :id="'listOptions_'+gcWidgetId" class="is-horizontal is-flex is-hidden">
              <!--div class="is-horizontal is-flex">
                <div class="field is-vertical">
                  <div class="field-label">
                    <label class="label has-text-left is-grey"> Option1 </label></div>
                  <div class="field-body">
                    <div class="select is-small">
                      <select id="selOption1" v-model="option1" disabled>
                          <option value="" selected>Default</option>
                          <option value="bla">Bla</option>
                          <option value="blu">Blu</option>
                      </select>
                    </div>
                  </div>
                </div -->
            </div><!-- list options -->

            <div :id="'list_'+ this.gcWidgetId" :class="[gcWidgetCollapsed ? '': 'is-hidden']">

            <!-- data -->
            <div :id="'listTable_'+gcWidgetId" class="">
              <table class="table is-narrow is-fullwidth" 
                      v-model="parcels" v-if="parcels">
                <thead class="title is-7">
                  <tr>
                    <th style="white-space: nowrap; text-transform: capitalize; color: #EF7D00;" v-show="availableFields.includes('parcelId')">{{$t('fields.id')}}
                      <span class="">
                        <i class="fas fa-sort" style="cursor: pointer;" v-on:click="sortByAttribute('parcel_id')"></i>
                      </span>
                    </th>
                    <th style="white-space: nowrap; text-transform: capitalize; color: #EF7D00;" v-show="availableFields.includes('name')">{{$t('fields.name')}}
                      <span class="">
                      <i class="fas fa-sort" style="cursor: pointer;" v-on:click="sortByAttribute('name')"></i>
                      </span>
                    </th>
                    <th style="white-space: nowrap; text-transform: capitalize; color: #EF7D00;" v-show="availableFields.includes('crop')">{{$t('fields.crop')}}
                      <span class="">
                      <i class="fas fa-sort" style="cursor: pointer;" v-on:click="sortByAttribute('crop')"></i>
                      </span>
                   </th>
                    <th style="white-space: nowrap; text-transform: capitalize; color: #EF7D00;" v-show="availableFields.includes('entity')">{{$t('fields.entity')}}
                      <span class="">
                      <i class="fas fa-sort" style="cursor: pointer;" v-on:click="sortByAttribute('entity')"></i>
                      </span>
                    </th>
                    <th style="white-space: nowrap; text-transform: capitalize; color: #EF7D00;" v-show="availableFields.includes('planting')">{{$t('fields.planting')}}
                      <span class="">
                      <i class="fas fa-sort" style="cursor: pointer;" v-on:click="sortByAttribute('planting')"></i>
                      </span>
                    </th>
                    <th style="white-space: nowrap; text-transform: capitalize; color: #EF7D00;" v-show="availableFields.includes('harvest')">{{$t('fields.harvest')}}
                      <span class="" style="white-space: nowrap;">
                      <i class="fas fa-sort" style="cursor: pointer;" v-on:click="sortByAttribute('harvest')"></i>
                      </span>
                    </th>
                    <th style="white-space: nowrap; text-transform: capitalize; color: #EF7D00;" v-show="availableFields.includes('area')">{{$t('fields.area')}}
                      <span class="" style="white-space: nowrap;">
                      <i class="fas fa-sort" style="cursor: pointer;" v-on:click="sortByAttribute('area')"></i>
                      </span>
                    </th> 
                    <th style="white-space: nowrap; text-transform: capitalize; color: #EF7D00;" v-show="availableFields.includes('homogeneity')">{{$t('fields.homogeneity')}}
                      <span class="" style="white-space: nowrap;">
                      <i class="fas fa-sort" style="cursor: pointer;" v-on:click="sortByAttribute('homogeneity')"></i>
                      </span>
                    </th>            
                    <th style="white-space: nowrap;" v-show="availableFields.includes('fieldAnalysis')">
                      <span class="" style="white-space: nowrap;"></span>
                    </th>
                  </tr>
                </thead>
                <tbody class="is-size-7">
                  <tr v-for="p in parcels" v-on:mouseover="setCurrentParcelId" style="cursor: pointer;">
                    <td class="list-row-selected" v-if="p.parcel_id === currentParcelId" v-show="availableFields.includes('parcelId')"><span class="is-small">{{p.parcel_id}}</span></td>
                    <td v-else v-show="availableFields.includes('parcelId')"><span style="color: black;" class="is-small">{{p.parcel_id}}</span></td>
                    <td class="list-row-selected" v-if="p.parcel_id === currentParcelId" v-show="availableFields.includes('name')"><span class="is-small">{{p.name}}</span></td>
                    <td v-else v-show="availableFields.includes('name')"><span style="color: black;" class="is-small">{{p.name}}</span></td>
                    <td class="list-row-selected" v-if="p.parcel_id === currentParcelId" v-show="availableFields.includes('crop')"><span class="is-small">{{p.crop}}</span></td>
                    <td v-else  v-show="availableFields.includes('crop')"><span style="color: black;" class="is-small">{{p.crop}}</span></td>
                    <td class="list-row-selected" v-if="p.parcel_id === currentParcelId" v-show="availableFields.includes('entity')"><span class="is-small">{{p.entity}}</span></td>
                    <td v-else v-show="availableFields.includes('entity')"><span style="color: black;" class="is-small">{{p.entity}}</span></td>
                    <td class="list-row-selected" v-if="p.parcel_id === currentParcelId" v-show="availableFields.includes('planting')"><span class="is-small">{{p.planting}}</span></td>
                    <td v-else v-show="availableFields.includes('planting')"><span style="color: black;" class="is-small">{{p.planting}}</span></td>
                    <td class="list-row-selected" v-if="p.parcel_id === currentParcelId" v-show="availableFields.includes('harvest')"> <span class="is-small">{{p.harvest}}</span></td>
                    <td v-else v-show="availableFields.includes('harvest')"><span style="color: black;" class="is-small">{{p.harvest}}</span></td>
                    <td class="list-row-selected" v-if="p.parcel_id === currentParcelId" v-show="availableFields.includes('area')"><span class="is-small">{{p.area}}</span></td>
                    <td v-else v-show="availableFields.includes('area')"><span class="is-small">{{p.area}}</span></td>
                    <td class="list-row-selected" v-if="p.parcel_id === currentParcelId" v-show="availableFields.includes('homogeneity')">
                      <span class="is-small" v-if="p.homogeneity === 'true'">
                        <i class="fas fa-check-circle gc-is-tertiary"/>
                      </span>
                      <span class="is-small" v-if="p.homogeneity === 'false'">
                        <i class="fas fa-minus-circle gc-is-tertiary"/>
                      </span>
                      <span class="is-small" v-if="p.homogeneity === 'error'">
                        <i class="fas fa-exclamation-triangle gc-is-tertiary"/>
                      </span>
                    </td>
                    <td v-else>                    
                 
                        <div v-if="p.homogeneity === 'true'" v-show="availableFields.includes('homogeneity')">
                          <span class="is-small"><i style="color: #32CD32;" class="fas fa-check-circle"/></span> 
                        </div>

                        <div v-if="p.homogeneity === 'false'" v-show="availableFields.includes('homogeneity')">
                          <span class="is-small"><i style="color: red;" class="fas fa-minus-circle"/></span>
                        </div>

                        <div v-if="p.homogeneity === 'error'" v-show="availableFields.includes('homogeneity')">
                          <span class="is-small"><i style="color: #F6BE00;" class="fas fa-exclamation-triangle"/></span>
                        </div>
                     </td>                    
                    
                  </tr>
                </tbody>
              </table>
            </div>
            <!-- data -->

          </div><!-- list -->            
        </div><!-- gcWidgetId -->`,
  data: function () {
    console.debug("list! - data()");
    return {
      lastSortOrder: false
    }
  },
  //init internationalization
  i18n: { 
    locale: this.currentLanguage,
    messages: gcListLocales
  },
  created: function () {
    console.debug("gc-list - created()");
    this.changeLanguage(); //initial i18n from prop gcLanguage
  },
  /* when vue component is mounted (ready) on DOM node */
  mounted: function () {

    //initial loading data
    console.debug("list! - mounted()");
  },
  computed: {
    parcels: {
      get: function () { 
        // show only these parcels with matching ids with parcelIds
        // if (this.visibleParcelIds.length > 0)        
        // return this.gcParcels.filter(p => this.visibleParcelIds.includes(p.parcel_id+ "")); //convert to string for filtering
        return this.gcParcels
      },
      set: function (newValue) {
        console.debug("parcels setter");
        this.$root.$emit('parcelsChange', newValue);
      }
    },
    visibleParcelIds: {
      get: function () { 
        return this.gcVisibleParcelIds;
      },
      set: function (newValue) {
        this.$root.$emit('visibleParcelIdsChange', newValue);
      }
    },
    currentParcelId: {
      get: function () { 
        return this.gcCurrentParcelId;
      },
      set: function (newValue) {
        this.$root.$emit('currentParcelIdChange', parseInt(newValue));
      }
    },
    availableFields: {
      get: function () {
        return this.gcAvailableFields.split(",");
      }
    },
    availableOptions: {
      get: function() {
        return (this.gcAvailableOptions.split(","));
      }
    },
    currentLanguage: {
      get: function() {
        // will always reflect prop's value 
        return this.gcLanguage;
      },
    }
  },
  watch: {
    gcParcels: function(newValue, oldValue) {
      // inital setting of parcels only!
      //newValue.sort(function(a,b) { return parseInt(a.parcel_id) - parseInt(b.parcel_id); }); // sort by parcel id asc
    },
    currentLanguage(newValue, oldValue) {
      this.changeLanguage();
    }
  },
  methods: {
    toggleListOptions: function() {
      this.gcWidgetCollapsed = !this.gcWidgetCollapsed;
    },
    setCurrentParcelId: function(event) {
      console.debug("setCurrentParcelId()");

      // may be span or td or a (span -> td -> tr)
      // walk the DOM upwards til found the tr element
      let tr = event.target.parentElement;
      while (true)  {
        if (tr.localName === "tr") {
          break;
        }
        else {
          tr = tr.parentElement;
        }
      }

      // parcel id is first td -> first span of tr
      let id = tr.children[0].children[0].innerText;

      this.currentParcelId = parseInt(id);
      console.debug("Parcel ID "+ this.currentParcelId);
      
    },
    sortByAttribute: function (attribute) {
      console.debug("sorting by "+ attribute);

      this.lastSortOrder = !this.lastSortOrder;

      // don't sort with operators - function must return -1 or 1
      this.parcels.sort( function (a,b) {
        if (this.lastSortOrder) {
          return a[attribute] > b[attribute] ? -1 : a[attribute] < b[attribute] ?  1 : 0 
        }
        else {
          return a[attribute] > b[attribute] ? 1 : a[attribute] < b[attribute] ?  -1 : 0
        }
      }.bind(this));

      // sort() will not trigger the rendering, so force it
      this.$forceUpdate();
    },
    // getFieldAnalysisLink: function() {
    //   // either configured base URL
    //   if (this.gcFieldAnalysisLink) {
    //     // check for query parameter: ? -> append parcel_id with &
    //     if (this.gcFieldAnalysisLink.includes("?"))
    //       return this.gcFieldAnalysisLink + "&parcel_id="+this.currentParcelId;
    //     else // else -> append parcel_id with ?
    //       return this.gcFieldAnalysisLink + "?parcel_id="+this.currentParcelId;
    //   }
    // },
    /* helper functions */
    formatDecimal: function (decimal, numberOfDecimals) {
      /* Helper function for formatting numbers to given number of decimals */

      var factor = 100;

      if (isNaN(parseFloat(decimal))) {
        return NaN;
      }
      if (numberOfDecimals == 1) {
        factor = 10;
      }
      if (numberOfDecimals == 2) {
        factor = 100;
      }
      if (numberOfDecimals == 3) {
        factor = 1000;
      }
      if (numberOfDecimals == 4) {
        factor = 10000;
      }
      if (numberOfDecimals == 5) {
        factor = 100000;
      }
      return Math.ceil(decimal * factor) / factor;
    },
    changeLanguage() {
      this.$i18n.locale = this.currentLanguage;
    }
  }
});
