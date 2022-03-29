import React, { useEffect, useRef } from "react";
import { useState } from 'react';
import mapboxgl, { DoubleClickZoomHandler } from "mapbox-gl";
import fetchFakeData from "./fetchFakeData";
import Popup from "./Popup";
import "./styles/BaseMap.scss";
import ReactDOM from "react-dom";
import { useSelector } from 'react-redux';
import { Button } from "@mui/material";
import SwipeableDrawer from '@mui/material/SwipeableDrawer';
const API_KEY = "pk.eyJ1IjoiemJhYWtleiIsImEiOiJja3pvaXJ3eWM0bnV2MnVvMTc2d2U5aTNpIn0.RY-K9qwZD1hseyM5TxLzww";

let map;
let testRoute = [];

function getRouteURL(type, coords, language)
{
  return `https://api.mapbox.com/directions/v5/mapbox/${type}/${(new URLSearchParams(coords).toString()).slice(0,-1)}?alternatives=true&geometries=geojson&language=${language}&overview=simplified&steps=true&access_token=${API_KEY}`;
}

async function getDataFromURL(url)
{
  let result = await fetch(url);
  let answer = null;
  if(result.ok)
    answer = await result.json();
  return answer;
}

function addToRoute(object)
{
  if(testRoute.filter(x => x.properties.id === object.properties.id).length === 0)
      testRoute.push(object);
  console.log(testRoute.length);
}

export async function postRoute()
{
    let formData = new FormData();
    let coords = [];
    let out = [];

    formData.append('points', JSON.stringify(testRoute));
    formData.append('vehicle', 'driving');

    await fetch('http://localhost:5000/route', {
      method: 'post',
      body: formData,
      credentials: 'include',
    }).then(res => res.json())
    .then(res => res.forEach(x => coords.push(x.geometry.coordinates)));
    if(map.getSource('route1'))
    {
      map.removeLayer("layer1");
      map.removeSource('route1');
      map.removeLayer("route2");
      map.removeSource('route');
    }
    for(let count = 1; count < coords.length; count++)
    {
      let rout = await getDataFromURL(getRouteURL("walking", `${coords[count].join(",")};${coords[count - 1].join(",")}`, "en"));
      out.push(rout.routes[0].geometry.coordinates);
    }
    out = out.reduce((a, b) => a.concat(b));
    map.addSource('route1', {
      'type': 'geojson',
      'data': {
      'type': 'Feature',
      'properties': {},
      'geometry': {
      'type': 'LineString',
      'coordinates': out
      }
      }
      });
      map.addLayer({
      'id': 'layer1',
      'type': 'line',
      'source': 'route1',
      'layout': {
      'line-join': 'round',
      'line-cap': 'round'
      },
      'paint': {
      'line-color': 'yellow',
      'line-width': 5
      }
      });
      map.addSource('route2', {
        'type': 'geojson',
        'data': {
        'type': 'Feature',
        'properties': {},
        'geometry': {
        'type': 'LineString',
        'coordinates': coords
        }
        }
        });
        map.addLayer({
        'id': 'route2',
        'type': 'line',
        'source': 'route2',
        'layout': {
        'line-join': 'round',
        'line-cap': 'round'
        },
        'paint': {
        'line-color': 'red',
        'line-width': 5
        }
        });
  }

  /*const response = await fetch("http://localhost:5000/route", {
            method: 'POST',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(testRoute),
          });
          response.json().then(data => {
            console.log(data);
          });*/

/*const TestButton = () => {
    useEffect(() => {
      <Button></Button>
      console.log("test");
    });
};*/

const BaseMap = () => {
    
    //mapbox://styles/mapbox/satellite-v9
    //mapbox://styles/mapbox/light-v10
    let theme = "mapbox://styles/mapbox/navigation-night-v1";
  
    const [open, setOpen] = useState(false);
    
   /* useSelector(state => {
        try{
           
            if(state.theme == "light"){
             
              setTheme("mapbox://styles/mapbox/light-v10")
               
            }else{
              setTheme("mapbox://styles/mapbox/navigation-night-v1")
               
            }
          
        }catch(e){
          setTheme("mapbox://styles/mapbox/navigation-night-v1");
        }
    });*/

      const language = useSelector(state => {
        try{
          return state.language;
        }catch(e){
          return "de";
        }
      });
    

  mapboxgl.accessToken = "pk.eyJ1IjoiemJhYWtleiIsImEiOiJja3pvaXJ3eWM0bnV2MnVvMTc2d2U5aTNpIn0.RY-K9qwZD1hseyM5TxLzww";

  const mapContainerRef = useRef(null);
  const popUpRef = useRef(new mapboxgl.Popup({ offset: 15 }));
      
  const [obj, setObj] = useState({properties: {name: 'test'}});


  useEffect(() => {
    
    map = new mapboxgl.Map({
      container: "mapContainer",
      center: [11.657244, 46.717705],
      style: theme,
      zoom: 12,
    });

    const nav = new mapboxgl.NavigationControl();
    map.addControl(nav, "top-right");
    map.addControl(new mapboxgl.ScaleControl({position: 'bottom-right'}));
    const geolocate = new mapboxgl.GeolocateControl({
        positionOptions: {
          enableHighAccuracy: true
        },
        trackUserLocation: true
      });
      
      map.addControl(geolocate, "top-right");

      let coordinates;
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function(position) {
          coordinates = [position.coords.latitude, position.coords.longitude];
        });
      }

      map.on("load", () => {
        map.flyTo({
          center: [
             coordinates[1], // Example data
             coordinates[0] // Example data
          ],
          essential: true // this animation is considered essential with respect to prefers-reduced-motion
       });

       map.loadImage('https://img.icons8.com/color/344/marker--v1.png',
       function(error, image) {
               if (error) throw error;
               map.addImage('marker--v1', image);
           }
       );

        // add the data source for new a feature collection with no features
        map.addSource("random-points-data", {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features: []
          }
        });

        // now add the layer, and reference the data source above by name
        map.addLayer({
          id: "random-points-layer",
          source: "random-points-data",
          type: "symbol",
          layout: {
            // full list of icons here: https://labs.mapbox.com/maki-icons
            "icon-image": "marker--v1", // this will put little croissants on our map
            "icon-padding": 0,
            "icon-allow-overlap": true,
            "icon-size":0.08
          }
        });
      });

    
      
    map.on("moveend", async () => {
      // get new center coordinates
      let lon=coordinates[1];
      let lat=coordinates[0];
      /*lon = "12.4907795";
      lat = "41.8897653"*/
      // fetch new data
      
    });

    // change cursor to pointer when user hovers over a clickable feature
    map.on("mouseenter", "random-points-layer", async e => {

      if (e.features.length) {
        const feature = e.features[0];   

        /*console.log(feature.properties.id)
        console.log("asdfasdfasdfasdf");
        console.log(feature.properties.wikidata);
        let desc=await getDetail(feature.properties.id)
        let pdesc="";
        console.log("aa")
        console.log(desc)*/
        /*if(desc.hasOwnProperty('wikipedia_extracts')){
          pdesc=desc.wikipedia_extracts.text
        }*/
        // create popup node
        const popupNode = document.createElement("div");

        ReactDOM.render(<Popup feature={feature} />, popupNode);
        // <img src="./kolosseum.jpg"></img>
        //ReactDOM.render(<Button variant="contained" style={{borderRadius: '20px'}} onClick={() => addToRoute(feature)}>Add</Button>, popupNode);
        ReactDOM.render(<div><img src={`https://commons.wikimedia.org/wiki/Special:FilePath/${(await getDataFromURL(`https://www.wikidata.org/w/api.php?action=wbgetclaims&property=P18&entity=${feature.properties.wikidata}&format=json&origin=*`)).claims.P18[0].mainsnak.datavalue.value.replace(/\s/g, "_")}?width=300`} style={{width:"100%", height:"50%"}}></img>
          <div style={{display: "flex", justifyContent: "space-between"}}><p style={{color:'black'}}>{feature.properties.name}</p>
          <Button variant="contained" style={{borderRadius: '20px', backgroundColor: "white", color: "black"}} onClick={() => addToRoute(feature)}>Add</Button></div></div>, popupNode);

        //popupNode  = document.createElement("div");
        // set popup on map
        popUpRef.current
          .setLngLat(feature.geometry.coordinates)
          .setDOMContent(popupNode)
          .addTo(map);
               
      }
    });

    async function getDetail(id){
      let result = await fetch('https://api.opentripmap.com/0.1/en/places/xid/'+id+'?apikey=5ae2e3f221c38a28845f05b690c520033dc6de71c6665213ffad8752');
      let answer = null;
      if(result.ok)
        answer = await result.json();
      return answer;
    }

    // reset cursor to default when user is no longer hovering over a clickable feature
    map.on("mouseleave", "random-points-layer", () => {
      //mapboxgl-popup-close-button
      popUpRef.current.remove();
        
    });

    

    // add popup when user clicks a point
    map.on("click", "random-points-layer", e => {
      if (e.features.length) {
        setObj(e.features[0]);
        setOpen(true);
      }
    });
  }, 
  []);

  

  return (<div>
    <div id="mapContainer" className="map" ref={map}></div>
    
    <SwipeableDrawer 
        anchor='bottom'
        open={open}
        onClose={() => setOpen(false)}
        onOpen={() => {}}>
          <div>
            <div style={{width:"100%", maxHeight:"30%", maxWidth:"100%"}}>
            <div><img src="https://media.istockphoto.com/photos/colosseum-in-rome-during-sunrise-picture-id1271579758?b=1&k=20&m=1271579758&s=170667a&w=0&h=oyXB8ehFjbo5-9HDdSjI9hYZktLstV3Ixz4JUUynahU=" style={{maxWidth:"100%"}}></img></div>
            <div style={{display: "flex", justifyContent: "space-between"}}>
              <h2 id="nameField" style={{color:'white'}}>{obj.properties.name}</h2>
              <Button variant="contained" style={{borderRadius: '20px', backgroundColor: "white", color: "black"}} onClick={() => addToRoute(obj)}>Add</Button>
            </div>
            </div>
          </div>
            
      </SwipeableDrawer>
     
  </div>
  );

};


export async function flyToLocation (coords, radius){
  
    map.flyTo({
      center: [
        coords[0],
        coords[1]
      ],
      essential: true // this animation is considered essential with respect to prefers-reduced-motion
    });

    const results = await fetchFakeData({ longitude: coords[0], latitude: coords[1], radius2: radius });
    console.log(results);
    // update "random-points-data" source with new data
    // all layers that consume the "random-points-data" data source will be updated automatically
    map.getSource("random-points-data").setData(results);

}





export default BaseMap;