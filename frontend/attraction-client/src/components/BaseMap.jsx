import mapboxgl from '!mapbox-gl'; // eslint-disable-line import/no-webpack-loader-syntax
import AltRouteIcon from '@mui/icons-material/AltRoute';
import ArrowCircleDownIcon from '@mui/icons-material/ArrowCircleDown';
import DeleteIcon from '@mui/icons-material/Delete';
import AddLocationAltIcon from '@mui/icons-material/AddLocationAlt';
import DirectionsIcon from '@mui/icons-material/Directions';
import DirectionsBikeIcon from '@mui/icons-material/DirectionsBike';
import DirectionsCarFilledIcon from '@mui/icons-material/DirectionsCarFilled';
import DirectionsWalkIcon from '@mui/icons-material/DirectionsWalk';
import GpsFixedIcon from '@mui/icons-material/GpsFixed';
import GpsOffIcon from '@mui/icons-material/GpsOff';
import ImportExportIcon from '@mui/icons-material/ImportExport';
import RouteIcon from '@mui/icons-material/Route';
import SaveIcon from '@mui/icons-material/Save';
import SendIcon from '@mui/icons-material/Send';
import ShuffleIcon from '@mui/icons-material/Shuffle';
import { Box, Button, Card, InputAdornment, Dialog, DialogContent, DialogActions, DialogContentText, DialogTitle, Chip, CircularProgress, TextField, Checkbox, Drawer, FormControlLabel, OutlinedInput, Rating, Switch, Tooltip, Typography, FormGroup } from "@mui/material";
import Zoom from '@mui/material/Zoom';
import React, { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import arrowImage from './arrow.png';
import ErrorSnackbar from './ErrorSnackbar';
import friendMarker from './friendAvatar.png';
import blueMarker from './locationBlue.png';
import redMarker from './locationRed.png';
import MapSearch from "./MapSearch";
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import Popup from "./Popup";
import "./styles/BaseMap.css";
import SuccessSnackbar from './SuccessSnackbar';
import ListIcon from '@mui/icons-material/List';
import GpsNotFixedIcon from '@mui/icons-material/GpsNotFixed';

let map = null;
let countUserPoints = 0;
let marker;
let testRoute = [];
let selectedSights = {"type": "FeatureCollection", "features": []};
let radiusForPointerSearch = 1;
let searchByMarker = false;
let lastCoords = [];
let lastRadius = 1;
let filter = {architecture: true, cultural: true, historic: true, natural: true, religion: true, tourist_facilities: true, museums: true, palaces: true, malls: true, churches: true, monuments_and_memorials: true};
let currentGlobalResults = {type: "FeatureCollection", features: []};
let timerID;
let globalPopup = "", globalPopup2 = "";
let geolocate;
let lastPositionByMapboxGeolocate = [];
let returnToStart = false;
let startAtGps = false;
let userEnabledMapboxLocation = false;
let timeInHours = false;
let lastSentCoordinates = [];
let currentLineCoords = [];
let saveRouteName = "";
let markersWithNumbersGeoJson = null;
let timeoutForGpsLoading = null;
let trackUserLocationEnd = false;
let routeToDeleteName = "";
let popupTimeout=null;

export function setFilter(newFilter){
        filter = newFilter;
}

async function getDataFromURL(url)
{
    let result = await fetch(url);
    let answer = null;
    if(result.ok)
        answer = await result.json();
    return answer;
}


export async function postRoute(data, directionMode, setDidCalculateRoute, setCurrentRouteOutput, setCurrentDurationInMinutes, setCurrentKilometers, setCurrentNotSortedPointsRouteOutput, setShowLoadingCircleRoute, setWeatherData, setLanguageTags)
{   
    if(data.length < 1){
        return;
    }

    if(data[0]["properties"]["id"] === "gpsLocatorId")
            data.shift();

    if(startAtGps){//addpoint of gps to data
        data.unshift(JSON.parse('{"geometry":{"type":"Point","coordinates":['+lastPositionByMapboxGeolocate+']},"type":"Feature","properties":{"id":"gpsLocatorId","name":"Your location","wikidata":"nodata","kinds":"nokinds"},"layer":{"id":"attraction-points-layer","type":"symbol","source":"attraction-points-data","layout":{"icon-image":"marker-red","icon-padding":0,"icon-allow-overlap":true,"icon-size":0.08},"paint":{}},"source":"attraction-points-data","state":{}}'));
    }

    if(data.length < 2){
        if (map.getSource('route1')) {
            map.removeLayer("arrow-layer");
            map.removeLayer("layer1");
            map.removeSource('route1');
        }
        if(map.getSource("route-points-data")){
            map.removeLayer("route-points-layer");
            map.removeSource("route-points-data");
        }
        return;
    }
    setShowLoadingCircleRoute(true);
    if(map.getSource("route-points-data")){
        map.removeLayer("route-points-layer");
        map.removeSource("route-points-data");
    }
    let formData = new FormData();
    let route, sortedIDs, weather, sortedCoords;

    formData.append('points', JSON.stringify(data));
    formData.append('vehicle', directionMode);
    formData.append('returnToStart', returnToStart);
    await fetch('https://10.10.30.18:8444/route', {
        method: 'post',
        body: formData,
        credentials: 'include',
    }).then(res => res.json())
        .then(res => {route = res.route; sortedIDs = res.sortedIDs; sortedCoords = res.sortedCoords; weather = res.weather})
        .catch(err => {
            setShowLoadingCircleRoute(false);
            return;
    });

    if (map.getSource('route1')) {
        map.removeLayer("arrow-layer");
        map.removeLayer("layer1");
        map.removeSource('route1');
    }
    
    setWeatherData({ icon: weather.weather[0].icon, temp: weather.main.temp });
    setDidCalculateRoute(true);
    setCurrentNotSortedPointsRouteOutput(data);
    setCurrentRouteOutput(sortedIDs)
    setCurrentDurationInMinutes(Math.round(route.duration / 60));
    timeInHours = false;
    if(Math.round(route.duration / 60) > 59){
        setCurrentDurationInMinutes(convertMinsToHrsMins(Math.round(route.duration / 60)));
        timeInHours = true;
    }

    setCurrentKilometers(Math.round(route.distance / 1000 * 10) / 10);
    currentLineCoords = route.coords;
    map.addSource('route1', {
        'type': 'geojson',
        'data': {
            'type': 'Feature',
            'properties': {},
            'geometry': {
                'type': 'LineString',
                'coordinates': route.coords
            }
        }
    });
    map.addLayer({
        'id': 'layer1',
        'type': 'line',
        "icon-allow-overlap" : true,
        "text-allow-overlap": true,
        'source': 'route1',
        'filter': ['==', '$type', 'LineString'],
        'layout': {
            'line-join': 'round',
            'line-cap': 'round'
        },
        'paint': {
            'line-color': '#3cb2d0',
            'line-width': {
                'base': 0.5,
                'stops': [
                    [1, 0.5],
                    [3, 2],
                    [4, 2.5],
                    [8, 3],
                    [15, 6],
                    [22, 8]
                ]
                }
        }
    });

    map.loadImage(arrowImage, function(err, image2) {
        if(!map.hasImage('arrow')){
        if (err) {
        console.error('err image', err);
        return;
        }
        map.addImage('arrow', image2);
    }

        map.addLayer({
        'id': 'arrow-layer',
        'type': 'symbol',
        "icon-allow-overlap" : true,
        "text-allow-overlap": true,
        'source': 'route1',
        'minzoom': 5,
        'layout': {
            'symbol-placement': 'line',
            'symbol-spacing': 40,
            'icon-allow-overlap': true,
            'icon-image': 'arrow',
            'icon-size': 0.3,
            'visibility': 'visible'
        }
        });
    });
    
    //get coordinates of data
    let coords = [];
    for(let i = 0; i < data.length; i++){
        coords.push(data[i]["geometry"]["coordinates"]);
    }

    let markersWithNumbers = [];
    let l = 0;
    if(returnToStart)
        l = 1;
    for(let i = 0; i<sortedCoords.length-l; i++){
        if(sortedCoords[i][0] !== null || sortedCoords[i][1] !== null){
            if(l === 1 && i === 0)
                markersWithNumbers.push({type:"Feature",geometry:{type:"Point", coordinates: [sortedCoords[i][0],sortedCoords[i][1]]} , properties:{id:"coord"+i,title:1 + " & " + sortedCoords.length}});
            else 
                markersWithNumbers.push({type:"Feature",geometry:{type:"Point", coordinates: [sortedCoords[i][0],sortedCoords[i][1]]} , properties:{id:"coord"+i,title:i+1}});
        }
    }
    
    if(map.getSource("selected-attractions-points-data")){
        map.removeLayer("selected-attraction-points-layer");
        map.removeSource("selected-attraction-points-data");
    }
    //markersWitrhNumbers to geojson
    markersWithNumbersGeoJson = {
        "type": "FeatureCollection",
        "features": markersWithNumbers
    };
    //layer with points and data as points
    map.addSource('route-points-data', {
        'type': 'geojson',
        'data': markersWithNumbersGeoJson,
        tolerance: 0
    });
    map.addLayer({
        id: "route-points-layer",
        source: "route-points-data",
        type: "symbol",
        layout: {
            "icon-image": "marker-blue",
            "icon-padding": 0,
            "icon-allow-overlap" : true,
            "text-allow-overlap": true,
            "icon-size": 0.8,
            'text-field': ['get', 'title'],
            'text-font': [
            'Open Sans Semibold',
            'Arial Unicode MS Bold'
            ],
            'text-offset': [0, 1.25],
            'text-anchor': 'top',
        },
        paint: {
            "text-color": "#313638",
            "text-halo-color": "#f7fff7",
            "text-halo-width": 4
        }
});
    setShowLoadingCircleRoute(false);

    //focus 1st point
    map.flyTo({
            center: [
                sortedCoords[0][0], sortedCoords[0][1]
            ],
            zoom: 15.5,
            speed: 1,
            essential: true // this animation is considered essential with respect to prefers-reduced-motion
    });
    
}

const convertMinsToHrsMins = (mins) => {
    let h = Math.floor(mins / 60);
    let m = mins % 60;
    h = h < 10 ? '0' + h : h;
    m = m < 10 ? '0' + m : m;
    return `${h}:${m}`;
}

function BaseMap (props) {
    
    const [showAddButton, setShowAddButton] = useState(true);
    const [openRouteDrawer, setOpenRouteDrawer] = useState(false);
    const [directionMode, setDirectionMode] = useState("driving");
    const [didCalculateRoute, setDidCalculateRoute] = useState(false);
    const [currentDurationInMinutes, setCurrentDurationInMinutes] = useState("-1");
    const [currentKilometers, setCurrentKilometers] = useState("-1");
    const [weatherData, setWeatherData] = useState({});
    const [themeMap, setThemeMap] = useState(props.t1);
    const [enabled3D, setEnabled3D] = useState(false);

    const[disableHandleRandomLocationButton,setDisableHandleRandomLocationButton] = useState(false);
    const[showLoadingCircleRoute, setShowLoadingCircleRoute] = useState(false);
    const[showSuccessSnack, setShowSuccessSnack] = useState(false);

    const[showRouteSavedSuccessSnackbar, setShowRouteSavedSuccessSnackbar] = useState(false);
    const[showRouteSavedErrorSnackbar, setShowRouteSavedErrorSnackbar] = useState(false);



    const [currentSortedPointsRouteOutput, setCurrentSortedPointsRouteOutput] = useState([]);
    const [currentNotSortedPointsRouteOutput, setCurrentNotSortedPointsRouteOutput] = useState([]);
    const [currentAddedPoints, setCurrentAddedPoints] = useState([]);

    const[disabledGpsButton, setDisabledGpsButton] = useState(true);
    const[showGpsFixedButton, setShowGpsFixedButton] = useState(true);

    const [currentlyLookingForPois, setCurrentlyLookingForPois] = useState(true);
 
    const [filteredPoiList, setFilteredPoiList] = useState({"type": "FeatureCollection", "features": []});
    const [filterPoiListText, setFilterPoiListText] = useState("");
   
    const[avgRating, setAvgRating] = useState(0);
    const[howManyReviews, setHowManyReviews] = useState(0);

    const [currentRandomLocation, setCurrentRandomLocation] = useState(false);

    const [languageTags, setLanguageTags] = useState({  
                                                        addButton: "ADD TO ROUTE",
                                                        removeButton: "REMOVE FROM ROUTE",
                                                        searchHere: "SEARCH HERE?",
                                                        driving: "Driving", walking: "Walking", cycling: "Cycling",
                                                        closeThisWindow: "Close this window",
                                                        errorNoRoute: "Add at least 2 Points to calculate a Route!",
                                                        errorNoRouteDescription: "If you can't see any points on your map try a new search and adjust your radius and filters. If you still can't see anything it might be that there are no POIs in that area!",
                                                        deleteHoleRouteButton: "Delete the hole route!",
                                                        yourPoints: "Current Points",
                                                        currentRoute: "Current Route",
                                                        minutes: "Minutes",
                                                        calculateBestRouteButton: "CALCULATE BEST ROUTE",
                                                        exploreRandomLocation: "EXPLORE A RANDOM LOCATION",
                                                        returnToStart: "Return to start point",
                                                        startAtMyCurrentPosition: "Start at my current position",
                                                        returnToStartTooltip: "If you activate this setting your starting point will also be your end point!",
                                                        startAtMyCurrentPositionWorkingTooltip: "If you activate this setting your route will start at your current gps location!",
                                                        startAtMyCurrentPositionDisabledTooltipTag: "Set your location on the map to use this feature.",
                                                        flyTo: "You fly to: ",
                                                        unableToRetrieveLocation: "Unable to retrieve your location!",
                                                        gpsNotSupported: "GPS is not supported on your device.",
                                                        ratingSuccessText: "Rating saved successfully",
                                                        noPoisErrorText: "No POIs found in this area! Try to change your radius, filters or search at a new location.",
                                                        importSavedRoutes: "IMPORT SAVED ROUTES",
                                                        nameCurrentRouteText: "Name to save current route",
                                                        poiListHeading: "Choose POIs that you want to visit",
                                                        searchPoiText: "Filter",
                                                        noPoiInListFound: "No Pois found. Change your searchtext.",
                                                        poiListAddAllPointsButton: "Add all points",
                                                        poiListRemoveAllPointsButton: "Remove all points",
                                                        areYouSafe: "Are you sure?",
                                                        dialogText1: "All added items in the list will be removed!",
                                                        dialogText2: "Your entire route will be deleted!",
                                                        dialogCancel: "Cancel",
                                                        dialogApprovePoints: "Delete Points",
                                                        dialogApproveRoute: "Delete Route",
                                                        removePoiFromMap: "REMOVE FROM MAP",
                                                        deleteRoute: "Delete Route",
                                                        deleteRouteDialog1: "Delete route ",
                                                        deleteRouteDialog2: " permanently?",
                                                        routeSavedSuccessfullyText: "Route was saved successfully!",
                                                        routeSavedErrorText: "Error while saving your route. Try again!",
                                                        noSavedRoutes: "You have no saved routes to import!"
                                                    });


    const [ratingErrorText, setRatingErrorText] = useState("Error while rating the POI.");

    const [showRatingErrorSnackbar, setShowRatingErrorSnackbar] = useState(false);
    const [showRatingSuccessSnackbar, setShowRatingSuccessSnackbar] = useState(false);
    const [showNoPoisFoundErrorSnackbar, setShowNoPoisFoundErrorSnackbar] = useState(false);

    const[routeToDeleteNameState, setRouteToDeleteNameState] = useState("");

    const [gpsActive, setGpsActive] = useState(false);
    const [currentlyLoadingGpsClass, setCurrentlyLoadingGpsClass] = useState(false);
    const [geolocationSupported, setGeolocationSupported] = useState(true);
    const [unableToRetrieveLocation, setUnableToRetrieveLocation] = useState(false);

    const[clickedImportRouteButton, setClickedImportRouteButton] = useState(false);

    const[routeNames, setRouteNames] = useState([]);                                            

    useEffect(() =>{
        
        if(props.l1 === "de"){
            
            setLanguageTags({  
                addButton: "ZUR ROUTE HINZUFÜGEN",
                removeButton: "VON ROUTE LÖSCHEN",
                searchHere: "HIER SUCHEN?",
                driving: "Auto", walking: "Zu Fuß", cycling: "Rad",
                closeThisWindow: "Dieses Fenster schließen",
                errorNoRoute: "Füge mindestens 2 Sehenswürdigkeiten hinzu, um eine Route zu berechnen!",
                errorNoRouteDescription: "Wenn du keine Punkte sehen kann, probiere es mit einer neuen Suche mit angepasstem Radius und Filtern auf der Karte. Solltest du dann immer noch nichts sehen sind in diesem Bereich keine Sehenswürdigkeiten verfügbar!",
                deleteHoleRouteButton: "KOMPLETTE ROUTE LÖSCHEN!",
                yourPoints: "Aktuelle Punkte",
                currentRoute: "Aktuelle Route",
                minutes: "Minuten",
                calculateBestRouteButton: "OPTIMALE ROUTE BERECHNEN",
                exploreRandomLocation: "ZUFÄLLIG ERKUNDEN",
                returnToStart: "Zum Startpunkt zurückkehren",
                startAtMyCurrentPosition: "Bei jetztigem Standort starten",
                returnToStartTooltip: "Wenn du diese Einstellung aktivierst, ist dein Startpunkt auch dein Endpunkt.",
                startAtMyCurrentPositionWorkingTooltip: "Wenn du diese Einstellung aktivierst, startet die Route bei deiner momentanen GPS Position.",
                startAtMyCurrentPositionDisabledTooltipTag: "Setze deine Position auf der Karte um diese Einstellung zu verwenden.",
                flyTo: "Du fliegst nach: ",
                unableToRetrieveLocation: "Deine Position kann nicht festgestellt werden!",
                gpsNotSupported: "Die GPS Funktion wird für dein Gerät nicht unterstützt.",
                ratingSuccessText: "Bewertung erfolgreich gespeichert",
                noPoisErrorText: "Keine Sehenswürdigkeiten in diesem Umkreis gefunden! Versuche deinen Radius oder deine Filter zu verändern oder probiere es mit einer neuen Suche.",
                importSavedRoutes: "GESPEICHERTE ROUTEN IMPORTIEREN",
                nameCurrentRouteText: "Name um die Route zu speichern",
                poiListHeading: "Wähle Sehenswürdigkeiten die du besuchen möchtest!",
                searchPoiText: "Filter",
                noPoiInListFound: "Keine Sehenswürdigkeiten gefunden. Ändere deinen Suchtext.",
                poiListAddAllPointsButton: "Alle Punkte hinzufügen",
                poiListRemoveAllPointsButton: "Alle Punkte löschen",
                areYouSafe: "Bist du dir sicher?",
                dialogText1: "Alle hinzugefügten Punkte in der Liste werden entfernt.",
                dialogText2: "Deine komplette Route wird gelöscht!",
                dialogCancel: "Abbrechen",
                dialogApprovePoints: "Punkte löschen",
                dialogApproveRoute: "Route löschen",
                removePoiFromMap: "VON DER KARTE ENTFERNEN",
                deleteRoute: "Route löschen",
                deleteRouteDialog1: "Route ",
                deleteRouteDialog2: " für immer löschen?",
                routeSavedSuccessfullyText: "Route wurde gespeichert!",
                routeSavedErrorText: "Die Route konnte nicht gespeichert werden. Probiere es erneut!",
                noSavedRoutes: "Du hast keine gespeicherten Routen zum importieren!"
            });
            setRatingErrorText("Fehler beim Bewerten der POI.");
            if(map !== null){
                map.getStyle().layers.forEach(function(thisLayer){
                    if(thisLayer.id.includes("state") || thisLayer.id.includes("country") || thisLayer.id.includes("admin") ){
                        if(thisLayer.type == 'symbol'){
                             map.setLayoutProperty(thisLayer.id, 'text-field', ['get','name_de']);
                        }
                    }
                });
            }

        }else if(props.l1 === "it"){

            setLanguageTags({  
                addButton: "AGGIUNGI AL itinerario",
                removeButton: "RIMUOVERE DAL itinerario",
                searchHere: "CERCARE QUI?",
                driving: "In macchina", walking: "A Piedi", cycling: "Bici",
                closeThisWindow: "Chiudere questa finestra",
                errorNoRoute: "Aggiungi almeno 2 punti per calcolare un percorso!",
                errorNoRouteDescription: "Se non riesci a vedere nessun punto sulla tua mappa, prova una nuova ricerca e regola il raggio e i filtri. Se ancora non vedi nulla, potrebbe essere che non ci sono POI in quella zona!",
                deleteHoleRouteButton: "Elimina tutto il percorso!",
                yourPoints: "Punti correnti",
                currentRoute: "Percorso attuale",
                minutes: "Minuti",
                calculateBestRouteButton: "CALCOLA IL PERCORSO OTTIMALE",
                exploreRandomLocation: "ESPLORARE UN LUOGO CASUALE",
                returnToStart: "Tornare al punto di partenza",
                startAtMyCurrentPosition: "Iniziare dalla mia posizione attuale",
                returnToStartTooltip: "Se attivi questa impostazione il tuo punto di partenza sarà anche il tuo punto di arrivo!",
                startAtMyCurrentPositionWorkingTooltip: "Se attivi questa impostazione il tuo percorso inizierà dalla tua attuale posizione gps!",
                startAtMyCurrentPositionDisabledTooltipTag: "Imposta la tua posizione sulla mappa per utilizzare questa funzione.",
                flyTo: "Si vola verso: ",
                unableToRetrieveLocation: "Impossibile recuperare la tua posizione!",
                gpsNotSupported: "Il GPS non è supportato sul tuo dispositivo.",
                ratingSuccessText: "Voto salvato con successo",
                noPoisErrorText: "Nessun POI trovato in questa zona! Prova a regolare il raggio o i filtri o cerca una nuova posizione.",
                importSavedRoutes: "IMPORTA I PERCORSI SALVATI",
                nameCurrentRouteText: "Nome per salvare il percorso",
                poiListHeading: "Scegli i POI che vuoi visitare",
                searchPoiText: "Filtro",
                noPoiInListFound: "Nessun Pois trovato. Cambia il tuo testo di ricerca.",
                poiListAddAllPointsButton: "Aggiungi tutti i punti",
                poiListRemoveAllPointsButton: "Rimuovere tutti i punti",
                areYouSafe: "Sei sicuro?",
                dialogText1: "Tutti gli elementi aggiunti nella lista vengono rimossi.",
                dialogText2: "Il tuo intero percorso sarà cancellato!",
                dialogCancel: "Cancella",
                dialogApprovePoints: "Cancellare i punti",
                dialogApproveRoute: "Cancellare il percorso",
                removePoiFromMap: "Rimuovi dalla mappa",
                deleteRoute: "Rimuovere percorso",
                deleteRouteDialog1: "Rimuovere per sempre il percorso ",
                deleteRouteDialog2: " ?",
                routeSavedSuccessfullyText: "Il percorso è stato salvato con successo!",
                routeSavedErrorText: "Errore durante il salvataggio del percorso. Riprova!",
                noSavedRoutes: "Non hai percorsi salvati da importare!"

            });
            setRatingErrorText("Errore durante il voto della segnaletica.");

            if(map !== null){
                map.getStyle().layers.forEach(function(thisLayer){
                    if(thisLayer.id.includes("state") || thisLayer.id.includes("country") || thisLayer.id.includes("admin") ){
                        if(thisLayer.type == 'symbol'){
                            map.setLayoutProperty(thisLayer.id, 'text-field', ['get','name_it']);
                        }
                    }
                });
            }

        } else {

            setLanguageTags({  
                addButton: "ADD TO ROUTE",
                removeButton: "REMOVE FROM ROUTE",
                searchHere: "SEARCH HERE?",
                driving: "Driving", walking: "Walking", cycling: "Cycling",
                closeThisWindow: "Close this window",
                errorNoRoute: "Add at least 2 Points to calculate a Route!",
                errorNoRouteDescription: "If you can't see any points on your map try a new search and adjust your radius and filters. If you still can't see anything it might be that there are no POIs in that area!",
                deleteHoleRouteButton: "Delete the hole route!",
                yourPoints: "Current Points",
                currentRoute: "Current Route",
                minutes: "Minutes",
                calculateBestRouteButton: "CALCULATE BEST ROUTE",
                exploreRandomLocation: "EXPLORE A RANDOM LOCATION",
                returnToStart: "Return to start point",
                startAtMyCurrentPosition: "Start at my current position",
                returnToStartTooltip: "If you activate this setting your starting point will also be your end point!",
                startAtMyCurrentPositionWorkingTooltip: "If you activate this setting your route will start at your current gps location!",
                startAtMyCurrentPositionDisabledTooltipTag: "Set your location on the map to use this feature.",
                flyTo: "You fly to: ",
                unableToRetrieveLocation: "Unable to retrieve your location!",
                gpsNotSupported: "GPS is not supported on your device.",
                ratingSuccessText: "Rating saved successfully",
                noPoisErrorText: "No POIs found in this area! Try to adjust your radius or filters or search at a new location.",
                importSavedRoutes: "IMPORT SAVED ROUTES",
                nameCurrentRouteText: "Name to save current route",
                poiListHeading: "Choose POIs that you want to visit",
                searchPoiText: "Filtrare",
                noPoiInListFound: "Nessun Pois trovato. Cambia il tuo testo di ricerca.",
                poiListAddAllPointsButton: "Add all points",
                poiListRemoveAllPointsButton: "Remove all points",
                areYouSafe: "Are you sure?",
                dialogText1: "All added items in the list will be removed!",
                dialogText2: "Your entire route will be deleted!",
                dialogCancel: "Cancel",
                dialogApprovePoints: "Delete Points",
                dialogApproveRoute: "Delete Route",
                removePoiFromMap: "REMOVE FROM MAP",
                deleteRoute: "Delete Route",
                deleteRouteDialog1: "Delete route ",
                deleteRouteDialog2: " permanently?",
                routeSavedSuccessfullyText: "Route was saved successfully!",
                routeSavedErrorText: "Error while saving your route. Try again!",
                noSavedRoutes: "You have no saved routes to import!"
            });
            setRatingErrorText("Error while rating the POI.");

            if(map !== null){
                map.getStyle().layers.forEach(function(thisLayer){
                    if(thisLayer.id.includes("state") || thisLayer.id.includes("country") || thisLayer.id.includes("admin") ){
                            if(thisLayer.type == 'symbol'){
                                map.setLayoutProperty(thisLayer.id, 'text-field', ['get','name_en']);
                        }
                    }
                });
            }

        }

    },[props.l1]);
    let timerPoiText = null;
    useEffect(() => {
        clearTimeout(timerPoiText);
        if(currentGlobalResults["features"].length === 0)
            return;
        try{
            timerPoiText = setTimeout(() => {
                let ft = currentGlobalResults["features"].filter(item => item["properties"]["name"].toLowerCase().replaceAll(" ", "").includes(filterPoiListText.toLowerCase().replaceAll(" ", "")));
                setFilteredPoiList({"type": "FeatureCollection", "features": ft});
            }, 100);
        }catch(e){}
    }, [filterPoiListText]);

    useEffect(()=> {
        newMap(themeMap, setImage, imageSrc, setShowLoadingInsteadPicture, popUpRef, setObj, setShowAddButton, pointIsInRoute, setOpen);
    },[themeMap]);

    let imageSrc = "";

    const [open, setOpen] = useState(false);
    const [openPoiListDrawer, setOpenPoiListDrawer] = useState(false);
    const [image, setImage] = useState("");
    const[showLoadingInsteadPicture, setShowLoadingInsteadPicture] = useState(true);

    mapboxgl.accessToken = "pk.eyJ1IjoiemJhYWtleiIsImEiOiJja3pvaXJ3eWM0bnV2MnVvMTc2d2U5aTNpIn0.RY-K9qwZD1hseyM5TxLzww";

   // const mapContainerRef = useRef(null);
    const popUpRef = useRef(new mapboxgl.Popup({ offset: 15 }));
        
    const [obj, setObj] = useState({properties: {name: 'test'}});
    const [markerCoords, setMarkerCoords] = useState([]);
    const [clickedFriends, setClickedFriends] = useState(false);
    const [checkedInPoiList, setCheckedInPoiList] = useState({});

    const [openPoiListDialog, setOpenPoiListDialog] = useState(false);
    const [openDeleteHoleRouteDialog, setOpenDeleteHoleRouteDialog] = useState(false);
    const [openRemoveRouteFromDatabaseDialog, setOpenRemoveRouteFromDatabaseDialog] = useState(false);

useEffect(() => {
        
        //Brixen
        lastCoords =  [11.65598, 46.71503];
        newMap(props.t1, setImage, imageSrc, setShowLoadingInsteadPicture, popUpRef, setObj, setShowAddButton, pointIsInRoute, setOpen);
        
        
        //fetch get request
        fetch("https://10.10.30.18:8444/route-names", {
            method: "GET",
            credentials: "include"
        })
        .then(res => res.json())
        .then(data => setRouteNames(data));
        
        let interval1;
    
        geolocate.on('geolocate', function(e) {

            setGpsActive(true);
            setCurrentlyLoadingGpsClass(false);
            lastPositionByMapboxGeolocate = [e.coords.longitude, e.coords.latitude];
    
            //posts location every 6 secs
            interval1 =  setInterval(async () => {
                
                if((lastPositionByMapboxGeolocate.length === 2) && ((lastSentCoordinates[0] != lastPositionByMapboxGeolocate[0]) || (lastSentCoordinates[1] != lastPositionByMapboxGeolocate[1]))){
                    let formData = new FormData();
                    formData.append('latitude', lastPositionByMapboxGeolocate[1]);
                    formData.append('longtitude', lastPositionByMapboxGeolocate[0]);
                    fetch("https://10.10.30.18:8444/add-position", {
                        method: "post",
                        body: formData,
                        credentials: 'include'
                    });
                    lastSentCoordinates = lastPositionByMapboxGeolocate;
                }
            }, 6000)

        });

        setTimeout(async () => {
            getFriendsLocation();
        }, 3000);

        //gets location of friends every 10 secs
        let interval2 = setInterval(async () => {
            getFriendsLocation()
        }, 12000);

        return () => {
            clearInterval(interval1);
            clearInterval(interval2);
            lastPositionByMapboxGeolocate = [];
            lastSentCoordinates = [];
            let formData = new FormData();
            formData.append('latitude', null);
            formData.append('longtitude', null);

            fetch("https://10.10.30.18:8444/add-position", {
                method: "post",
                body: formData,
                credentials: 'include'
            });
        };

},[]);

async function getFriendsLocation(){

    const positions = await fetch("https://10.10.30.18:8444/all-positions", {
        method: "get",
        credentials: 'include'
    });
    let locationOfFriends = await positions.json();
    let positionsFriends = [];
    for(let i = 0; i<locationOfFriends.length; i++){
        if(locationOfFriends[i]["longtitude"] !== null || locationOfFriends[i]["latitude"] !== null){
            positionsFriends.push({type:"Feature",geometry:{type:"Point",coordinates:[locationOfFriends[i]["longtitude"],locationOfFriends[i]["latitude"]]},properties:{id:"name"+i,name:locationOfFriends[i]["username"],title:locationOfFriends[i]["username"]}});
        }
    }

    if(positionsFriends.length !== 0){
        try{map.getSource("friends-points-data").setData({type: "FeatureCollection", features: positionsFriends});}
        catch (e){}
    }
        return null;

}

async function newMap(theme, setImage, imageSrc, setShowLoadingInsteadPicture, popUpRef, setObj, setShowAddButton, pointIsInRoute, setOpen){
    
    setEnabled3D(false);

    if(theme === "light"){
        theme = "mapbox://styles/mapbox/streets-v11";
    }else if(theme === "satellite"){
        theme = "mapbox://styles/mapbox/satellite-streets-v11";
    }else {
        theme = "mapbox://styles/mapbox/navigation-night-v1";
    }
    
    let zoom;
    let center;
  
    if(map !== null){
        try{
            center = map.getCenter();
            zoom = map.getZoom();
            map.remove();
        }catch (e){
            center = [11.65598, 46.71503];
            zoom=12;
            if(lastCoords.length !== 0)
                center = lastCoords;
            else
                lastCoords = [11.65598, 46.71503];
        }
    }
    else {
        center = [11.65598, 46.71503];
        zoom=12;
        if(lastCoords.length !== 0)
            center = lastCoords;
        else
            lastCoords = [11.65598, 46.71503];
    }
    if(lastCoords.length === 0)
        lastCoords = [11.65598, 46.71503];
    
    map = new mapboxgl.Map({
        container: "mapContainer",
        style: theme,
        zoom: zoom,
        maxPitch: 85,
        center: center,
        minZoom: 2,
    });
    map.addControl(new mapboxgl.ScaleControl({ position: 'bottom-left' }));
    geolocate = new mapboxgl.GeolocateControl({
        positionOptions: {
            enableHighAccuracy: true
        },
        trackUserLocation: true,
        showAccuracyCircle: true,
        // Draw an arrow next to the location dot to indicate which direction the device is heading.
        showUserHeading: true,
    });
    map.on("load", () => {
        map.addControl(geolocate);
        addAllLayersToMap(map);
	    map.resize();
        
        delay(800).then(() => {
            map.getStyle().layers.forEach(function(thisLayer){
                if(thisLayer.id.includes("state") || thisLayer.id.includes("country") || thisLayer.id.includes("admin") ){
                    if(thisLayer.type == 'symbol'){
                        if(props.l1==="de")
                            map.setLayoutProperty(thisLayer.id, 'text-field', ['get','name_de']);
                        else if(props.l1 === "it")
                            map.setLayoutProperty(thisLayer.id, 'text-field', ['get','name_it']);
                        else
                            map.setLayoutProperty(thisLayer.id, 'text-field', ['get','name_en']);
                    }
                }
            });
        });
        setDisabledGpsButton(false);
    });
    geolocate.on('trackuserlocationend', () => {
        setTimeout((() => {
            if(userEnabledMapboxLocation){
                trackUserLocationEnd = true;
                setShowGpsFixedButton(false);
            }
        }), 500);
        
    });

    map.doubleClickZoom.disable();    
    // change cursor to pointer when user hovers over a clickable feature
    map.on("mouseenter", "attraction-points-layer", async e => {

        if(e.features.length){
            const feature = e.features[0];
            setImage("");
            try{
                imageSrc = `https://commons.wikimedia.org/wiki/Special:FilePath/${(await getDataFromURL(`https://www.wikidata.org/w/api.php?action=wbgetclaims&property=P18&entity=${feature.properties.wikidata}&format=json&origin=*`)).claims.P18[0].mainsnak.datavalue.value.replace(/\s/g, "_")}?width=300`;
                if(imageSrc != undefined)
                    setImage(imageSrc);
            }catch(e){}
            
            delay(40).then(() => setShowLoadingInsteadPicture(false)); 

            popupTimeout = setTimeout(async () => {
    
                setShowLoadingInsteadPicture(true);
                var UserAgent = navigator.userAgent.toLowerCase();

                // Nur beim Computer
                if (UserAgent.search(/(iphone|ipod|opera mini|fennec|palm|blackberry|android|symbian|series60)/) < 0) {

                    
                    // create popup node
                
                    const popupNode = document.createElement("div");

                    ReactDOM.render(<Popup feature={feature} />, popupNode);
                    ReactDOM.render(<div><img src={imageSrc} alt="" style={{ width: "100%", height: "50%" }}></img>
                        <div style={{ display: "flex", justifyContent: "space-between" }}><p style={{ color: 'black' }}>{feature.properties.name}</p>
                        </div></div>, popupNode);
                    //popupNode  = document.createElement("div");
                    // set popup on map
                    popUpRef.current
                        .setLngLat(feature.geometry.coordinates)
                        .setDOMContent(popupNode)
                        .addTo(map);
                }
            
            }, 400);
        }
        
    });
    marker = new mapboxgl.Marker();
    // reset cursor to default when user is no longer hovering over a clickable feature
    map.on("mouseleave", "attraction-points-layer", () => {
        delay(200).then(() => {
            if(popupTimeout == null){
                delay(300).then(() => {
                    clearTimeout(popupTimeout);
                    popupTimeout = null;
                });
            }else {
                clearTimeout(popupTimeout);
                popupTimeout = null;
            }
            //mapboxgl-popup-close-button
            popUpRef.current.remove();
        });
    });
    // add popup when user clicks a point
    map.on("click", "attraction-points-layer", e => {
        if (e.features.length) {
            getImage(e["features"][0]["properties"]["wikidata"]);
            setObj(e.features[0]);
            setShowAddButton(!pointIsInRoute(e["features"][0]["properties"]["id"]));
            //get request with fetch
            fetch("https://10.10.30.18:8444/rating?"+new URLSearchParams({sight_id: e["features"][0]["properties"]["wikidata"]}), {
                method: "get",
                credentials: 'include'
            }).then(res => res.json()).then(data => {
                setAvgRating(data.avg)
                setHowManyReviews(data.count)
            });
            setOpen(true);
        }
    });
    map.on("click", "friends-points-layer", e => {
        setClickedFriends(true);
        if (e.features.length) {
            setObj(e.features[0]);
            setShowAddButton(!pointIsInRoute(e["features"][0]["properties"]["id"]));
            setOpen(true);
        }
    });

    map.on("dblclick", (e) => {
        let coords = [e.lngLat.lng, e.lngLat.lat];
        let popupNode  = document.createElement("div");
        ReactDOM.render(<div><Button variant="contained" fullWidth onClick={() => handleSearchByMarkerButton(coords, radiusForPointerSearch, setShowNoPoisFoundErrorSnackbar, setCurrentlyLookingForPois)} >Search here?</Button><Button sx={{mt:1.5}} variant="contained" fullWidth onClick={() => handleStartPointClickedByUserPoint(coords)} >STARTPOINT</Button><Button sx={{mt:1.5, mb:0.5}} variant="contained" onClick={() => handleAddClickedByUserPointToRoute(coords)} >Add this point to route!</Button></div>, popupNode);
        popUpRef.current
            .setLngLat(coords)
            .setDOMContent(popupNode)
            .addTo(map);
    });

    
    delay(100).then(async () => {
        try{
            while(map.getSource("selected-attraction-points-data") == undefined)
                await sleep(80);
            map.getSource('selected-attraction-points-data').setData(selectedSights);

            if(currentGlobalResults["features"].length > 0){
                //could take some time till layer exists
                while(map.getSource("attraction-points-data") == undefined)
                    await sleep(80);
                delay(50).then(() => {
                    map.getSource("attraction-points-data").setData(currentGlobalResults);
                });
            }

            if(lastCoords.length !== 0){
                let marker2 = new mapboxgl.Marker();
                // setMarkerCoords(coords)
                if(lastCoords[0] !== 11.65598 && lastCoords[1] !== 46.71503){
                    marker2.setLngLat(lastCoords).addTo(map);
                    globalPopup2 = marker2;
                }
            }
            
        } catch (e){};
        delay(200).then(() => {
            try {
                //route exists -> draw new
                if(currentLineCoords.length !== 0){
                    map.addSource('route1', {
                        'type': 'geojson',
                        'data': {
                            'type': 'Feature',
                            'properties': {},
                            'geometry': {
                                'type': 'LineString',
                                'coordinates': currentLineCoords
                            }
                        }
                    });
                    map.addLayer({
                        'id': 'layer1',
                        'type': 'line',
                        'source': 'route1',
                        "icon-allow-overlap" : true,
                        "text-allow-overlap": true,
                        'filter': ['==', '$type', 'LineString'],
                        'layout': {
                            'line-join': 'round',
                            'line-cap': 'round'
                        },
                        'paint': {
                            'line-color': '#3cb2d0',
                            'line-width': {
                                'base': 0.5,
                                'stops': [
                                [1, 0.5],
                                [3, 2],
                                [4, 2.5],
                                [8, 3],
                                [15, 6],
                                [22, 8]
                                ]
                            }
                        }
                    });

                    map.loadImage(arrowImage, function(err, image2) {
                        if(!map.hasImage('arrow')){
                            if (err) {
                                console.error('err image', err);
                                return;
                            }
                            map.addImage('arrow', image2);
                        }

                        map.addLayer({
                            'id': 'arrow-layer',
                            'type': 'symbol',
                            "icon-allow-overlap" : true,
                            "text-allow-overlap": true,
                            'source': 'route1',
                            'minzoom': 5,
                            'layout': {
                            'symbol-placement': 'line',
                            'symbol-spacing': 40,
                            'icon-allow-overlap': true,
                            'icon-image': 'arrow',
                            'icon-size': 0.3,
                            'visibility': 'visible'
                            }
                        });
                    });

                    if(markersWithNumbersGeoJson !== null){
                        //layer with points and data as points
                        map.addSource('route-points-data', {
                            'type': 'geojson',
                            'data': markersWithNumbersGeoJson,
                            tolerance: 0
                        });
                        map.addLayer({
                            id: "route-points-layer",
                            source: "route-points-data",
                            type: "symbol",
                            layout: {
                                "icon-image": "marker-blue",
                                "icon-padding": 0,
                                "icon-allow-overlap" : true,
                                "text-allow-overlap": true,
                                "icon-size": 0.8,
                                'text-field': ['get', 'title'],
                                'text-font': [
                                'Open Sans Semibold',
                                'Arial Unicode MS Bold'
                                ],
                                'text-offset': [0, 1.25],
                                'text-anchor': 'top',
                            },
                            paint: {
                                "text-color": "#313638",
                                "text-halo-color": "#fff",
                                "text-halo-width": 4
                            }
                    });
                    }
                }
            }catch (e){}
        });

    });

    delay(1200).then(() => {
        getFriendsLocation();

        // add a sky layer that will show when the map is highly pitched
        if (!map.getLayer("sky")) {
            map.addLayer({
                'id': 'sky',
                'type': 'sky',
                'paint': {
                    'sky-type': 'atmosphere',
                    'sky-atmosphere-sun': [0.0, 0.0],
                    'sky-atmosphere-sun-intensity': 20
                }
            });
        }
    });
    
}
    const sleep = (milliseconds) => {
        return new Promise(resolve => setTimeout(resolve, milliseconds))
    }

    async function getImage(wikidata){
        setImage("");
        try{
            imageSrc = `https://commons.wikimedia.org/wiki/Special:FilePath/${(await getDataFromURL(`https://www.wikidata.org/w/api.php?action=wbgetclaims&property=P18&entity=${wikidata}&format=json&origin=*`)).claims.P18[0].mainsnak.datavalue.value.replace(/\s/g, "_")}?width=300`;
            if(imageSrc != undefined)
                setImage(imageSrc);
        }catch(e){}
        delay(40).then(() => setShowLoadingInsteadPicture(false));
    }
    function pointIsInRoute(id){
        if (testRoute.some(item => item["properties"]["id"]===id)) 
            return true;
        return false;
    }
    function add_marker(coords) {
        setMarkerCoords(coords);
        marker.setLngLat(coords).addTo(map);
        globalPopup = marker;
    }
    function handleSearchByMarkerButton(markerCoords, radiusForPointerSearch, setShowNoPoisFoundErrorSnackbar, setCurrentlyLookingForPois) {
        if(globalPopup2 !== ""){
            globalPopup2.remove();
            globalPopup2 = "";
        }
        
        lastCoords = markerCoords;

        searchByMarker = true;

        popUpRef.current.remove();
        add_marker(markerCoords);

        flyToLocation(markerCoords, radiusForPointerSearch, false, setShowNoPoisFoundErrorSnackbar, setCurrentlyLookingForPois);
    }

    function handleAddClickedByUserPointToRoute(coords){
        //maybe add a marker or something
        popUpRef.current.remove();
        addClickedByUserPointToRoute(coords);
    }
    function handleStartPointClickedByUserPoint(coords){
        popUpRef.current.remove();
        addClickedByUserPointToRoute(coords, true);
    }

    function locationButtonClick(){
        setDisabledGpsButton(true);
        setShowGpsFixedButton(true);
        setTimeout(() => setDisabledGpsButton(false), 500);
        lastPositionByMapboxGeolocate = [];       
        geolocate.trigger();
        if(geolocate["_watchState"] == "OFF"){
            setGpsActive(false);
            startAtGps = false;
            userEnabledMapboxLocation = false;
        }else if (geolocate["_watchState"] == "WAITING_ACTIVE"){
            setCurrentlyLoadingGpsClass(true);
            userEnabledMapboxLocation = true;
        }else if(geolocate["_watchState"] == "ACTIVE_LOCK"){
            setCurrentlyLoadingGpsClass(false);
            userEnabledMapboxLocation = true;
            setGpsActive(true);
        }else if(geolocate["_watchState"] == "BACKGROUND"){
            setCurrentlyLoadingGpsClass(false);
            userEnabledMapboxLocation = true;
            setGpsActive(true);
        }else{
            setGpsActive(false);
            userEnabledMapboxLocation = false;
            setCurrentlyLoadingGpsClass(false);
        }
        
        if(userEnabledMapboxLocation){
            function success(position) {
                lastPositionByMapboxGeolocate = [position.coords.longitude,position.coords.latitude];
                setUnableToRetrieveLocation(false);
            }
            function error() {
                setGpsActive(false);
                setCurrentlyLoadingGpsClass(false);
                setUnableToRetrieveLocation(true);
                startAtGps = false;
            }
            if(!navigator.geolocation) {
                setGpsActive(false);
                setCurrentlyLoadingGpsClass(false);
                setGeolocationSupported(false);
                startAtGps = false;
            } else {
                setGeolocationSupported(true);
                navigator.geolocation.getCurrentPosition(success, error);
            }
        }
        setGpsActive(false);
        if(trackUserLocationEnd){
            setGpsActive(true);
            trackUserLocationEnd = false;
        }
    }

    function delay(time) {return new Promise(resolve => setTimeout(resolve, time));}


    function removePointFromRouteButtonClicked(obj){
        removePointFromRoute(obj["properties"]["id"]);
        setShowAddButton(true);
    }
    function removePointFromRoute(id)
    {
       let index = null;
        for(let i = 0; i<testRoute.length; i++){
            if(id===testRoute[i]["properties"]["id"]){
                index=i;
                break;
            }
        }
        if(index !== null)
        {
            testRoute.splice(index, 1);
            selectedSights.features.splice(index, 1);
        }
            
        setCurrentAddedPoints(testRoute);
        map.getSource('selected-attraction-points-data').setData(selectedSights);
    }

    function addPointToRouteButtonClicked(obj){
        //first check if object isnt already in the route!
        for(let i = 0; i<testRoute.length; i++)
            if(obj["properties"]["id"]===testRoute[i]["properties"]["id"])
                return;
        
        testRoute.push(obj);
        selectedSights.features.push(obj);
        map.getSource('selected-attraction-points-data').setData(selectedSights);
        setShowAddButton(false);
        setCurrentAddedPoints(testRoute);
    }

    function addClickedByUserPointToRoute(coords, asStartPoint = false){
        countUserPoints++;
        let objLocal = '{"geometry":{"type":"Point","coordinates":['+coords[0]+','+coords[1]+']},"type":"Feature","properties":{"id":"randomPoint'+countUserPoints+'","name":"Random Point '+countUserPoints+'","wikidata":"nodata"}}';
        
        if(asStartPoint){
            testRoute.unshift(JSON.parse(objLocal));
            selectedSights.features.unshift(JSON.parse(objLocal));
        }else{
            testRoute.push(JSON.parse(objLocal));
            selectedSights.features.push(JSON.parse(objLocal));
        }
        setCurrentAddedPoints(testRoute);
        map.getSource('selected-attraction-points-data').setData(selectedSights);
    }
    //remove
    const handleRemoveItem = (key) => {
        removePointFromRoute(key);
        setCurrentAddedPoints(currentAddedPoints.filter(item => item["properties"]["id"] !== key));
    };

    function deleteHoleRouteClicked(){
        setOpenDeleteHoleRouteDialog(true);
    }
    function handleDeleteHoleRouteDialogClose(){
        setOpenDeleteHoleRouteDialog(false);
    }
    function handleRemoveRouteFromDatabaseDialogClose(){
        setOpenRemoveRouteFromDatabaseDialog(false);
    }

    function deleteHoleRoute(){
        currentLineCoords = [];
        setCurrentAddedPoints([]);
        testRoute = [];
        selectedSights.features = [];
        setDidCalculateRoute(false);
        setCurrentSortedPointsRouteOutput([]);
        setCurrentNotSortedPointsRouteOutput([]);
        map.getSource('selected-attraction-points-data').setData(selectedSights);
        if (map.getSource('route1')) {
            map.removeLayer("layer1");
            map.removeLayer('arrow-layer');
            map.removeSource('route1');
        }
        if(map.getSource('route-points-data')){
            map.removeLayer('route-points-layer');
            map.removeSource('route-points-data');
        }
        countUserPoints = 0;
        setOpenDeleteHoleRouteDialog(false);
    }
    
    function enable3D(){
        setEnabled3D(!enabled3D);

        try{
            if (map.getLayer('add-3d-buildings') || map.getSource("mapbox-dem")) {
                if(map.getLayer("add-3d-buildings"))
                    map.removeLayer("add-3d-buildings");
                map.setTerrain();
                if(map.getSource("mapbox-dem"))
                    map.removeSource("mapbox-dem");
                map.setPitch(0)
                return;
        } } catch(e){return;}
       
        if(map.getStyle()["name"] !== "Mapbox Satellite"){
            const layers = map.getStyle().layers;
            const labelLayerId = layers.find(
            (layer) => layer.type === 'symbol' && layer.layout['text-field']
            ).id;
            
            // The 'building' layer in the Mapbox Streets
            // vector tileset contains building height data
            // from OpenStreetMap.
            map.addLayer({
            'id': 'add-3d-buildings',
            'source': 'composite',
            'source-layer': 'building',
            'filter': ['==', 'extrude', 'true'],
            'type': 'fill-extrusion',
            'minzoom': 9,
            'paint': {
            'fill-extrusion-color': '#aaa',
            
            // Use an 'interpolate' expression to
            // add a smooth transition effect to
            // the buildings as the user zooms in.
            'fill-extrusion-height': [
            'interpolate',
            ['linear'],
            ['zoom'],
            15,
            0,
            15.05,
            ['get', 'height']
            ],
            'fill-extrusion-base': [
            'interpolate',
            ['linear'],
            ['zoom'],
            15,
            0,
            15.05,
            ['get', 'min_height']
            ],
            'fill-extrusion-opacity': 0.8
            }
            },
            labelLayerId
            );
        }

        map.addSource('mapbox-dem', {
            'type': 'raster-dem',
            'url': 'mapbox://mapbox.mapbox-terrain-dem-v1',
            'tileSize': 512,
            'maxzoom': 14
        });
        // add the DEM source as a terrain layer with exaggerated height
        map.setTerrain({ 'source': 'mapbox-dem', 'exaggeration': 1.2 });    
        map.setPitch(80);
    }

    function startAtGpsSwitchChanged(value){
        startAtGps = value;
    }

    async function handleRandomLocationButton(){
       
        setDisableHandleRandomLocationButton(true);
        setOpenRouteDrawer(false);
        const resultRandomLocation = await fetch("https://10.10.30.18:8444/get-random-location", {
            method: "get",
            credentials:"include"
        });
            
        let randomLocation = (await resultRandomLocation.json());
        setCurrentRandomLocation(randomLocation[2]);
        setShowSuccessSnack(true);
        flyToLocation ([randomLocation[0], randomLocation[1]], 100, true, setShowNoPoisFoundErrorSnackbar, setCurrentlyLookingForPois);
        setDisableHandleRandomLocationButton(false);

    }

    async function handlePointListClick(obj){
        if(!obj["properties"]["id"].includes("randomPoint") || !obj["properties"]["wikidata"]){
            //set image
            try{
                let newimageSrc = `https://commons.wikimedia.org/wiki/Special:FilePath/${(await getDataFromURL(`https://www.wikidata.org/w/api.php?action=wbgetclaims&property=P18&entity=${obj.properties.wikidata}&format=json&origin=*`)).claims.P18[0].mainsnak.datavalue.value.replace(/\s/g, "_")}?width=300`;
                setImage(newimageSrc);
                delay(40).then(() => setShowLoadingInsteadPicture(false));
            }catch(e){}
            setShowAddButton(false);
            setObj(obj);
            setOpen(true);
        }else{
            setShowLoadingInsteadPicture(false);
        }
    }

    async function selectRouteFromToDatabase(nameRoute){
        testRoute = [];
        setCurrentAddedPoints(testRoute);
        setCurrentNotSortedPointsRouteOutput(testRoute);
        setCurrentSortedPointsRouteOutput(testRoute);

        let ids=[],names=[],wikidata=[],coordinates=[];
        await fetch("https://10.10.30.18:8444/route?"+new URLSearchParams({route_name: nameRoute}), {
            method: "get",
            credentials:"include"
        }).then(res => res.json()).then(res => {
            res.map((obj, index) => {
                ids.push(obj["point_id"]);
                names.push(obj["name"]);
                wikidata.push(obj["wikidata"]);
                coordinates.push([obj["longtitude"], obj["latitude"]]);
            });
        }).catch(e => {console.log(e)});
        
        for(let i = 0; i < ids.length; i++){
            let obj = {
                "type": "Feature",
                "properties": {
                    "id": ids[i],
                    "name": names[i],
                    "wikidata": wikidata[i]
                },
                "geometry": {
                    "type": "Point",
                    "coordinates": coordinates[i]
                }
            }
            testRoute.push(obj);
        }
        setCurrentAddedPoints(testRoute);
        setClickedImportRouteButton(false);
        setCurrentNotSortedPointsRouteOutput(testRoute);
       
        map.flyTo({
            center: [
                coordinates[0][0],
                coordinates[0][1]
            ],
            speed: 1.5,
            essential: true // this animation is considered essential with respect to prefers-reduced-motion
        });
        postRoute(testRoute, directionMode, setDidCalculateRoute, setCurrentSortedPointsRouteOutput, setCurrentDurationInMinutes, setCurrentKilometers, setCurrentNotSortedPointsRouteOutput, setShowLoadingCircleRoute, setWeatherData, setLanguageTags);
        setOpenRouteDrawer(false);
    }

    function removeRouteFromDatabase(name){
        setRouteToDeleteNameState(name);
        routeToDeleteName = name;
        setOpenRemoveRouteFromDatabaseDialog(true);
    }
    function removeRouteFromDatabaseSure(){
        if(routeToDeleteName === "")
            return;
        setOpenRemoveRouteFromDatabaseDialog(false);
        let formData = new FormData();
        formData.append("route_name", routeToDeleteName);
        fetch("https://10.10.30.18:8444/delete-route", {
            method: "post",
            body: formData,
            credentials:"include"
        }).then(data => {
            if(data.ok){
                let tempRoutes = [...routeNames];
                for(let i = 0; i<tempRoutes.length; i++){
                    if(tempRoutes[i]["route_name"] == routeToDeleteName){
                        tempRoutes.splice(i, 1);
                        break;
                    }
                }
                setRouteNames(tempRoutes);
            }else{
                console.log("error");
            }
        })
        .catch(e =>  console.log(e));
    }

    function saveCurrentRouteToDatabase(data, name){
        setShowRouteSavedSuccessSnackbar(false);
        setShowRouteSavedErrorSnackbar(false);
    
        if(name === ""){
            setShowRouteSavedErrorSnackbar(true);
            return;
        }
      
        let ids= [], names = [], wikidata = [], coordinates = [];
        //for each loop on data
        data.map(item => {
            ids.push(item.properties.id);
            names.push(item.properties.name);
            wikidata.push(item.properties.wikidata);
            coordinates.push(item.geometry.coordinates);
        });
        
        //create formdata
        let formData = new FormData();
        formData.append("route_name", name);
        formData.append("ids", JSON.stringify(ids));
        formData.append("names", JSON.stringify(names));
        formData.append("wikidata", JSON.stringify(wikidata));
        formData.append("coordinates", JSON.stringify(coordinates));

        //post
        fetch("https://10.10.30.18:8444/add-route", {
            method: "post",
            body: formData,
            credentials:"include"
        }).then(data => {
            if(data.ok){
                setShowRouteSavedSuccessSnackbar(true);
                setRouteNames([...routeNames, {route_name: name}]);
            }else{
                setShowRouteSavedErrorSnackbar(true);
            }
        })
        .catch(e =>  setShowRouteSavedErrorSnackbar(true));
    }


    const PointList = () => (
        <div>
            {currentAddedPoints.map((item,i) => {
                return (

                    <Card  key={item["properties"]["id"]}  sx={{mt:1.5, ml:1, mr:1, pt:0.65, pb:0.65, ':hover': {boxShadow: 5}}} elevation={3} style={{display:"flex", justifyContent:"space-between", borderRadius:"15px"}}>
                       
                       {item["properties"]["id"] === "gpsLocatorId" ? <Box key={i} style={{maxWidth:"80%"}}  sx={{mt:1, mb:1}}> <Typography style={{margin:"auto", marginLeft:"10px",  overflowWrap:"break-word"}}>{i+1}. {item["properties"]["name"]}</Typography> </Box> :  (item["properties"]["id"].includes("random") || !item["properties"]["wikidata"]) ? <Box key={i} style={{maxWidth:"80%"}} sx={{mt:1, mb:1}}> <Typography style={{margin:"auto", marginLeft:"10px",  overflowWrap:"break-word"}}>{i+1}. {item["properties"]["name"]}</Typography>  </Box> :  <Box key={i} onClick={() => handlePointListClick(item)} style={{maxWidth:"80%", cursor: "pointer"}}  sx={{mt:1, mb:1}}> <Typography style={{margin:"auto", marginLeft:"10px",  overflowWrap:"break-word"}}>{i+1}. {item["properties"]["name"]}</Typography>  </Box> }
                       
                        <Button style={{minHeight: "42px", minWidth:"50px", maxHeight:"42px", margin:"auto", marginLeft:"15px", marginRight:"10px",  borderRadius:"15px"}} 
                            key={item["properties"]["id"]} color="error" variant="contained"
                            onClick={ () => handleRemoveItem(item["properties"]["id"])}
                            >
                            <DeleteIcon />
                        </Button>

                    </Card>
                );
            })}
        </div>
    );

    function handleSaveRouteNameChange(e){
        saveRouteName = e.target.value;
    }

      const ShowIfEnoughPoints = (props) => {
            return(
                <div>     
                    <Card  sx={{mt:1.5, ml:1, mr:1}} >
                            <OutlinedInput
                                id="outlined-adornment-weight"
                                fullWidth
                                placeholder={languageTags.nameCurrentRouteText}
                                inputProps={{ maxLength: 299, 'aria-label': 'weight'}}
                                onChange={handleSaveRouteNameChange}
                                endAdornment={<Button onClick={() => saveCurrentRouteToDatabase(testRoute, saveRouteName)}><SaveIcon/></Button>}
                               />
                    </Card>

                    <Box  sx={{mt:2, ml:1, mr:1}}>
                        <Button variant="contained" sx={{minHeight: 50}} fullWidth disabled={showLoadingCircleRoute} onClick={() => postRoute(currentAddedPoints, directionMode, setDidCalculateRoute, setCurrentSortedPointsRouteOutput, setCurrentDurationInMinutes, setCurrentKilometers, setCurrentNotSortedPointsRouteOutput, setShowLoadingCircleRoute, setWeatherData)}>
                            <RouteIcon />{languageTags.calculateBestRouteButton} 
                        </Button>
                    </Box>
                   
                    <Card sx={{mt:2, ml:1, mr:1, pl:1,pt:1,pb:1,pr:1, mb:1.2}} elevation={5} style={{ borderRadius:"8px"}}>        
                    
                        <Box style={{display:"flex", justifyContent:"space-evenly", flexWrap: "wrap"}}>
                            <Tooltip placement="top" disableFocusListener enterTouchDelay={520}  title={languageTags.returnToStartTooltip} TransitionComponent={Zoom} arrow>
                                <FormControlLabel
                                    sx={{display: 'block',}}
                                    control={
                                        <Switch
                                        defaultChecked={returnToStart}
                                        onChange={(event) => returnToStart = event.target.checked}
                                        name="switchEnableReturnToStartpoint"
                                        color="primary"
                                        />
                                    }
                                    label={languageTags.returnToStart}
                                    />
                            </Tooltip>
                            <Tooltip placement="top" disableFocusListener enterTouchDelay={520} title={gpsActive ? languageTags.startAtMyCurrentPositionWorkingTooltip : languageTags.startAtMyCurrentPositionDisabledTooltipTag } TransitionComponent={Zoom} arrow>
                                <FormControlLabel
                                    sx={{display: 'block',}}
                                    control={
                                        <Switch
                                        defaultChecked={startAtGps}
                                        disabled={!gpsActive}
                                        onChange={(event) => startAtGpsSwitchChanged(event.target.checked)}
                                        name="loading"
                                        color="primary"
                                        />
                                    }
                                    label={languageTags.startAtMyCurrentPosition}
                                    />
                                </Tooltip>
                        </Box>

                        <Box style={{display:"flex", justifyContent:"space-evenly", flexWrap: "wrap"}}>
                            <Chip className="attributeChipsOfSearchbar" style={{minWidth:"25%", minHeight:"35px"}} icon={<DirectionsCarFilledIcon fontSize="small" />} label={languageTags.driving} variant={directionMode === "driving" ? "filled" : "outlined"} onClick={() => setDirectionMode("driving")} ></Chip>
                            <Chip className="attributeChipsOfSearchbar" style={{minWidth:"25%",  minHeight:"35px"}} icon={<DirectionsWalkIcon fontSize="small" />} label={languageTags.walking} variant={directionMode === "walking" ? "filled" : "outlined"} onClick={() => setDirectionMode("walking")}></Chip>
                            <Chip className="attributeChipsOfSearchbar" style={{minWidth:"25%",  minHeight:"35px"}} icon={<DirectionsBikeIcon fontSize="small" />} label={languageTags.cycling} variant={directionMode === "cycling" ? "filled" : "outlined"} onClick={() => setDirectionMode("cycling")}></Chip>
                        </Box>

                    </Card>   
                    {showLoadingCircleRoute ?
                        <Card sx={{mt:2, ml:1, mr:1, pl:1,pt:1,pb:1,pr:1, mb:1.5}} elevation={0} style={{ borderRadius:"8px", display:"flex", justifyContent:"space-evenly"}}>   
                            <CircularProgress size={40} color='grey' /> 
                        </Card>
                    : null }

                    { didCalculateRoute ?
                        <div>
                            <div style={{ display:"flex", alignItems:"center"}}>
                                <img style={{height:"50px", marginLeft:"5px"}} src={`https://openweathermap.org/img/wn/${weatherData.icon}.png`} alt='weather' ></img>
                              
                            </div>
                            <Card sx={{ mb:3, ml:1, mr:1, pt:1, pb:0.5}} style={{borderRadius:"8px"}} elevation={4}>
                                <Typography variant='body1' fontWeight={400} sx={{mt:1, mb:1}} style={{maxWidth:"90%", margin:"auto", marginLeft:"10px", marginBottom:"5px"}}><strong>{languageTags.currentRoute}:</strong> {currentDurationInMinutes} {timeInHours ? " h": languageTags.minutes}, {currentKilometers} km, {returnToStart ?  currentSortedPointsRouteOutput.length-1 : currentSortedPointsRouteOutput.length} POIs</Typography>
                                <SortedRouteNames></SortedRouteNames>
                            </Card>
                        </div>
                    : null}

                    <Card sx={{ mb:1.5, ml:1, mr:1, pt:0.5, pb:0.5, mt:4}} style={{ borderRadius:"8px"}} elevation={5}><Typography variant='h6' fontWeight={500} sx={{mt:0.8, mb:0.8}} style={{maxWidth:"90%", margin:"auto", marginLeft:"10px"}}>{languageTags.yourPoints}</Typography></Card>

                    <PointList></PointList>
                        
                    <Box  sx={{mt:5, ml:1, mr:1, mb: 1}}>
                        <Button color="error" fullWidth variant="contained" onClick={() => deleteHoleRouteClicked()}><DeleteIcon />{languageTags.deleteHoleRouteButton}</Button>
                    </Box>  
                </div>
            );
      }

      const SortedRouteNames = () => ( 
          <div>  
            {currentSortedPointsRouteOutput.map((item,i) => {
                return (
                    <div key={item["id"] ? item["id"]+i : item["properties"]["id"]+i}>
                        <Typography sx={{ml:1, mr:1}}><strong> {i+1}.</strong> {item.name} </Typography>
                        {i < currentSortedPointsRouteOutput.length-1 ? <Typography style={{height:"22.5px"}} sx={{ml:0.9}} ><ArrowCircleDownIcon fontSize='small'/></Typography> : <Typography sx={{mb:1}} ></Typography>}
                    </div>
                );
            })}
        </div>
    );

    const ShowOldRoutes = () => (
        <div>
            { routeNames.length > 0 ? 
                routeNames.map((item,i) => {
                    return (
                        <div key={item["route_name"]+i}>
                            <Card elevation={0} sx={{mt:1.3, mb:1}} style={{display:"flex", justifyContent:"space-evenly"}}>
                                <Button color="info" style={{ width:"76%", minWidth:"45px", marginLeft:"2px", marginRight:"4px", textTransform:"none"}} variant="contained" sx={{wordWrap:"break-word", mt:0.6}} onClick={() => selectRouteFromToDatabase(item["route_name"])} >{item["route_name"]}<AltRouteIcon/></Button> 
                                <Button color="error" style={{width:"13%", minWidth:"30px" ,marginLeft:"4px", marginRight:"2px"}} variant="contained" sx={{mt:0.6}} onClick={() => removeRouteFromDatabase(item["route_name"])} > <DeleteIcon /> </Button>
                            </Card>
                        </div>
                    );
                })
            : <Typography variant='h6' fontWeight={410} sx={{mt:2, mb:1.2, pt:0.5, pl:1, pr:1}} style={{margin:"auto", textAlign:"center"}}>{languageTags.noSavedRoutes}</Typography>
        }
        </div>
    );

      const ShowIfNotEnoughPoints = () => {
        return(
            <div>
                <Card sx={{mt:1.5, ml:1, mr:1}} >
                            <Button style={{minWidth:"100%", minHeight: "50px"}} variant="contained" onClick={() => setClickedImportRouteButton(!clickedImportRouteButton)}>{languageTags.importSavedRoutes}<ImportExportIcon/></Button>
                        {clickedImportRouteButton &&  <ShowOldRoutes/> }
                </Card>
                      
                <Card sx={{mt:3, mb:1.5, ml:1, mr:1, pt:0.5, pb:0.5}} style={{border:"solid grey 0.5px", borderRadius:"8px"}} elevation={7}><Typography variant='h6' fontWeight={500} sx={{mt:1, mb:1}} style={{maxWidth:"90%", margin:"auto", marginLeft:"10px"}}>{languageTags.errorNoRoute}</Typography>
                    <Typography variant='body1' fontWeight={400} sx={{mt:1, mb:1}} style={{maxWidth:"90%", margin:"auto", marginLeft:"10px"}}>{languageTags.errorNoRouteDescription}</Typography>
                </Card>
                <Box  sx={{mt:2, ml:1, mr:1}}>
                    <Button variant="contained" fullWidth onClick={() => setOpenRouteDrawer(false)}>{languageTags.closeThisWindow}</Button>  
                </Box>
            </div>
        );
      }

      const handleCloseSuccessSnackbar = (event, reason) => {
        if (reason === 'clickaway')
          return;
        setShowSuccessSnack(false);
      };
      const handleGpsErrorsnack = (event, reason) => {
        if (reason === 'clickaway')
          return;
        setUnableToRetrieveLocation(false);
      };
      const handleCloseRatingSuccessSnackbar = (event, reason) => {
        if (reason === 'clickaway')
          return;
        setShowRatingSuccessSnackbar(false);
      };
      const handleCloseRatingErrorSnackbar = (event, reason) => {
        if (reason === 'clickaway')
          return;
        setShowRatingErrorSnackbar(false);
      };
      const handleCloseRouteSavedSuccessSnackbar = (event, reason) => {
        if (reason === 'clickaway')
          return;
        setShowRouteSavedSuccessSnackbar(false);
      };
      const handleCloseRouteErrorSnackbar = (event, reason) => {
        if (reason === 'clickaway')
          return;
        setShowRouteSavedErrorSnackbar(false);
      };
      const handleGeolocationErrorsnack = (event, reason) => {
        if(reason === "clickaway")
            return;
        setGeolocationSupported(true)   
      }
      const handleNoPoisFoundErrorSnackbar = (event, reason) => {
        if (reason === 'clickaway')
            return;
        setShowNoPoisFoundErrorSnackbar(false);
        };
      function closeBottomDrawer(){
        setOpen(!open);

        //set timeout for 350 ms
        setTimeout(() => {
            setClickedFriends(false);
            setAvgRating(0);
            setShowLoadingInsteadPicture(true);
        }, 350);
       
      }
      

        async function ratingChange(newRating, obj){
            setShowRatingErrorSnackbar(false);
            setShowRatingSuccessSnackbar(false);
            let formdata = new FormData();
            formdata.append("rating", newRating);
            formdata.append("sight_id", obj["properties"]["wikidata"]);
            fetch(`https://10.10.30.18:8444/add-rating`, {
                method: "POST",
                credentials: "include",
                body: formdata
            }).then(res =>  {
                if(res.status === 200){
                    setShowRatingSuccessSnackbar(true);
                    fetch("https://10.10.30.18:8444/rating?"+new URLSearchParams({sight_id: obj["properties"]["wikidata"]}), {
                    method: "get",
                    credentials: 'include'
                    }).then(res => res.json()).then(data => {
                        setAvgRating(data.avg)
                        setHowManyReviews(data.count)
                    });
                }else{
                    setShowRatingErrorSnackbar(true);
                    res.text().then(t => setRatingErrorText(t));
                }
            }); 
        }

        function openPoiList(setOpenPoiListDrawer, value){

             if(value){
                for(let i = 0; i<currentGlobalResults["features"].length; i++){

                }
                let check = {};
                currentGlobalResults["features"].map((item) => {
                    check[item["properties"]["id"]] = pointIsInRoute(item["properties"]["id"]);
                });
                setCheckedInPoiList(check);
                setFilteredPoiList(currentGlobalResults);
                setOpenPoiListDrawer(true);
             }else{ 
                 setOpenPoiListDrawer(false);
                 delay(350).then(() => {               
                    setFilteredPoiList({"type": "FeatureCollection", "features": []});
                    setFilterPoiListText("");
                });
             }
        }
        function closeBottomPoiListDrawer(){
            setOpenPoiListDrawer(false);
            delay(350).then(() => {               
                setFilteredPoiList({"type": "FeatureCollection", "features": []});
                setFilterPoiListText("");
            });
          }
          function  handleCheckBoxChange(value, item){
            let c = checkedInPoiList;
            if(value){
                addPointToRouteButtonClicked(item);
                setCheckedInPoiList({
                    ...c,
                    [item["properties"]["id"]]: true
                });
            }else{
                removePointFromRoute(item["properties"]["id"]);
                setCheckedInPoiList({
                    ...c,
                    [item["properties"]["id"]]: false
                });
            }
          }
        function addAllListedPoints(filteredPoiList){
            let check = checkedInPoiList
            filteredPoiList["features"].map((item) => {
                addPointToRouteButtonClicked(item);
                check[item["properties"]["id"]] = true;
            });
            setCheckedInPoiList({...check});
        }
        function removeAllListedPoints(filteredPoiList){
            const keys = Object.keys(checkedInPoiList);
            for(let i = 0; i<keys.length; i++){
                if(checkedInPoiList[keys[i]]){
                    setOpenPoiListDialog(true);
                    break;
                }
            }    
        }

        function handleClosePoiListDialog(){
            setOpenPoiListDialog(false);
        }

        function closePoiDialogAndDeletePoints(){
            setOpenPoiListDialog(false);
            let check = checkedInPoiList;
            filteredPoiList["features"].map((item) => {
                removePointFromRoute(item["properties"]["id"]);
                check[item["properties"]["id"]] = false;
            });
            setCheckedInPoiList({...check});
        }
        function removePoiFromMap(id){
            setOpen(false);
            for(let i = 0; i<currentGlobalResults["features"].length; i++){
                if(currentGlobalResults["features"][i]["properties"]["id"] === id){
                    currentGlobalResults["features"].splice(i, 1);
                    break;
                }
            }
            map.getSource("attraction-points-data").setData(currentGlobalResults);
        }


    return (

        <div>
            <div id="mapContainer" className="map"></div>
            <div id="navi" style={{ marginLeft: "3.625em", minWidth:"30vw", maxWidth:"2.625em"}}>
            <MapSearch l1={props.l1} directionMode={directionMode} setThemeMap={setThemeMap} themeMap={themeMap} enable3D={enable3D} enabled3D={enabled3D} showErrorSnack={setShowNoPoisFoundErrorSnackbar} currentlyLookingForPois={setCurrentlyLookingForPois}></MapSearch>
            
            <div  id="test" style={{position: "fixed",top: "calc(100% - 221px)", left:"calc(100vw - 74px)"}}>
                <Button style={{width:"60px", height:"60px", backgroundColor:"white", borderRadius:"42%"}} variant="filled" onClick={() => setOpenRouteDrawer(!openRouteDrawer)}><DirectionsIcon fontSize="large" style={{color:"#2979ff"}} /></Button>
                {/* ! disable this button if there are no pois and disable it also if user searches for pois at a new places, only is enabled !after! the new pois are found, also make fontcolor grey */ }
                <Button disabled={currentlyLookingForPois} style={{width:"60px", marginTop:"11px", height:"60px", backgroundColor:"white", borderRadius:"42%"}} variant="filled" onClick={() => openPoiList(setOpenPoiListDrawer, !openPoiListDrawer)}> {currentlyLookingForPois ?  <ListIcon fontSize="large" style={{color:"grey"}} /> :  <ListIcon fontSize="large" style={{color:"#2979ff"}} />} </Button>
                <Button  style={{width:"60px", marginTop:"11px", height:"60px", backgroundColor:"white", borderRadius:"42%"}} disabled={!geolocationSupported || disabledGpsButton} variant="filled"  onClick={() => locationButtonClick()}> {unableToRetrieveLocation ? <GpsOffIcon color="error" fontSize="large" /> : (gpsActive ? (showGpsFixedButton ? <GpsFixedIcon style={{color:"#2979ff"}} fontSize="large" /> : <GpsNotFixedIcon style={{color:"#2979ff"}} fontSize="large" />) : <GpsOffIcon className={currentlyLoadingGpsClass ? 'loadingGpsClass' : 'notLoadingGpsClass'} fontSize='large'/>)}  </Button>
            </div>
    
        </div>
            <Drawer 
                anchor='bottom'
                transitionDuration	= {280}
                open={open}
                onClose={() => closeBottomDrawer()}>
                    <div style={{maxHeight:"60vh", minHeight:"200px"}}>
                        <div style={{width:"100%", maxHeight:"30%", maxWidth:"100%", marginTop:"20px", marginBottom:"10px", display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column"}}>
                            <div style={{maxWidth:"92%"}}>
                                <div style={{display:"flex", flexDirection:"column"}}> 
                                    {showAddButton ? <Button variant="contained" style={{marginBottom:"10px"}}  endIcon={<SendIcon />} onClick={() => addPointToRouteButtonClicked(obj)}>{languageTags.addButton}</Button> : <Button variant="contained" startIcon={<DeleteIcon />} style={{marginBottom:"10px"}} onClick={() => removePointFromRouteButtonClicked(obj)}>{languageTags.removeButton}</Button>}
                                    <h2 id="nameField" style={{marginBottom:"1px"}}>{obj.properties.name}</h2>
                                </div>
                                {clickedFriends ? null :  <Box sx={{display: 'flex',alignItems: 'center',}}> <Rating sx={{mb:1}} name="rating-attractions" onChange={(event, newValue) => {ratingChange(newValue, obj)}} value={avgRating} precision={0.5} />  <Box sx={{ ml: 1, mb:1 }}>({howManyReviews})</Box> </Box> }
                                {clickedFriends ? null : <div  style={{display:"flex", justifyContent:"center"}}> {showLoadingInsteadPicture ? <CircularProgress /> : <img src={image} alt="" style={{maxWidth:"100%", marginBottom:"10px"}}></img>}</div>}
                            </div>
                           {clickedFriends ? null : (!showLoadingInsteadPicture && <Button variant="contained" color="error" style={{marginBottom:"18px"}} onClick={() => removePoiFromMap(obj["properties"]["id"])} startIcon={<DeleteIcon />} >{languageTags.removePoiFromMap}</Button>)} 
                        </div>                     
                    </div>
            </Drawer>
        
            <Drawer 
                anchor='right'
                transitionDuration	= {280}
                open={openRouteDrawer}
                onClose={() => setOpenRouteDrawer(!openRouteDrawer)}>
                    
                    <div id="routeSwipeableDrawerDiv" >
            
                        {currentAddedPoints.length > 0 || currentSortedPointsRouteOutput.length > 1 ? <ShowIfEnoughPoints didCalculateRoute={didCalculateRoute} /> : <ShowIfNotEnoughPoints />}
                    
                        <Box  sx={{mt:2, ml:1, mr:1, mb:4}}>
                            <Button variant="contained" disabled={disableHandleRandomLocationButton} fullWidth onClick={() => handleRandomLocationButton(setShowNoPoisFoundErrorSnackbar)}>{languageTags.exploreRandomLocation} <ShuffleIcon/> </Button>
                        </Box>
                    
                    </div>
            </Drawer>

            { 
                <Drawer 
                    anchor='bottom'
                    transitionDuration	= {280}
                    open={openPoiListDrawer}
                    onClose={() => closeBottomPoiListDrawer()}>
                        <div style={{maxHeight:"67vh", minHeight:"67vh", paddingTop: "12px", paddingBottom: "60px"}}>
                            <Typography variant='h5' style={{paddingLeft:"30px"}} fontWeight={450} >{languageTags.poiListHeading}</Typography>
                            <Box style={{width:"60ch", maxWidth:"calc(100vw - 60px)", marginLeft:"30px"}}>
                                <TextField
                                    id="searchBarPois"
                                    type="text"
                                    fullWidth
                                    label={languageTags.searchPoiText}
                                    value={filterPoiListText}
                                    style={{marginTop:"14px"}}
                                    onChange={(e) => setFilterPoiListText(e.target.value)}
                                    InputProps={{
                                        startAdornment: (
                                        <InputAdornment position="start">
                                            <FilterAltIcon />
                                        </InputAdornment>
                                        ),
                                    }}
                                />
                                {filteredPoiList["features"].length > 0 ? 
                                    <Box sx={{mt:1.6}} style={{display:"flex", flexDirection:"column"}}>
                                        <Button variant="contained" fullWidth onClick={() => addAllListedPoints(filteredPoiList)}> {languageTags.poiListAddAllPointsButton} ({filteredPoiList["features"].length}) <AddLocationAltIcon /> </Button>
                                        <Button variant="contained" fullWidth sx={{mt:1.6}} color="error" onClick={() => removeAllListedPoints(filteredPoiList)}> {languageTags.poiListRemoveAllPointsButton} ({filteredPoiList["features"].length}) <DeleteIcon /> </Button>
                                    </Box>
                                : null    }
                                
                            </Box>
                            {   
                                <FormGroup style={{paddingLeft:"30px"}} sx={{pt: 1.6}}>
                                    { 
                                        filteredPoiList["features"].length > 0 ? 
                                            filteredPoiList["features"].map((item,i) => {
                                                    return (
                                                            <FormControlLabel key={item["properties"]["id"]} control={<Checkbox checked={checkedInPoiList[item["properties"]["id"]]} onChange={(e) => handleCheckBoxChange(e.target.checked, item)} />} label={(i+1) + ". " + filteredPoiList["features"][i]["properties"]["name"]} />
                                                    );
                                                })
                                            :
                                            <Typography variant='h6' fontWeight={450} sx={{color:"red"}}>{languageTags.noPoiInListFound}</Typography>
                                    } 
                                </FormGroup>
                            }
                        </div>
                </Drawer>
                
             }

            <Dialog
                open={openPoiListDialog}
                onClose={handleClosePoiListDialog}
                aria-labelledby="alert-dialog-title"
                aria-describedby="alert-dialog-description">
                <DialogTitle id="alert-dialog-title">{languageTags.areYouSafe}</DialogTitle>
                <DialogContent><DialogContentText id="alert-dialog-description">{languageTags.dialogText1}</DialogContentText></DialogContent>
                <DialogActions>
                    <Button onClick={handleClosePoiListDialog}>{languageTags.dialogCancel}</Button>
                    <Button color="error" onClick={closePoiDialogAndDeletePoints}>{languageTags.dialogApprovePoints}</Button>
                </DialogActions>
            </Dialog>

            <Dialog
                open={openDeleteHoleRouteDialog}
                onClose={handleDeleteHoleRouteDialogClose}
                aria-labelledby="alert-dialog-title2"
                aria-describedby="alert-dialog-description2">
                <DialogTitle id="alert-dialog-title2">{languageTags.areYouSafe}</DialogTitle>
                <DialogContent>
                <DialogContentText id="alert-dialog-description2">{languageTags.dialogText2}</DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleDeleteHoleRouteDialogClose}>{languageTags.dialogCancel}</Button>
                    <Button color="error" onClick={deleteHoleRoute}>{languageTags.dialogApproveRoute}</Button>
                </DialogActions>
            </Dialog>
            <Dialog
                open={openRemoveRouteFromDatabaseDialog}
                onClose={handleRemoveRouteFromDatabaseDialogClose}
                aria-labelledby="alert-dialog-title3"
                aria-describedby="alert-dialog-description3">
                <DialogTitle id="alert-dialog-title3">{languageTags.areYouSafe}</DialogTitle>
                <DialogContent>
                <DialogContentText id="alert-dialog-description3">{languageTags.deleteRouteDialog1 + routeToDeleteNameState + languageTags.deleteRouteDialog2}</DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleRemoveRouteFromDatabaseDialogClose}>{languageTags.dialogCancel}</Button>
                    <Button color="error" onClick={removeRouteFromDatabaseSure}>{languageTags.deleteRoute}</Button>
                </DialogActions>
            </Dialog>


            <SuccessSnackbar openSuccessSnack={showSuccessSnack} successMessage={languageTags.flyTo + currentRandomLocation} handleClose={handleCloseSuccessSnackbar}></SuccessSnackbar>
            <ErrorSnackbar openErrorSnack={unableToRetrieveLocation} errorMessage={languageTags.unableToRetrieveLocation} handleClose={handleGpsErrorsnack}></ErrorSnackbar>
            <ErrorSnackbar openErrorSnack={!geolocationSupported} errorMessage={languageTags.gpsNotSupported} handleClose={handleGeolocationErrorsnack}></ErrorSnackbar>

            <SuccessSnackbar openSuccessSnack={showRatingSuccessSnackbar} successMessage={languageTags.ratingSuccessText} handleClose={handleCloseRatingSuccessSnackbar}></SuccessSnackbar>
            <ErrorSnackbar openErrorSnack={showRatingErrorSnackbar} errorMessage={ratingErrorText} handleClose={handleCloseRatingErrorSnackbar}></ErrorSnackbar>

            <ErrorSnackbar openErrorSnack={showNoPoisFoundErrorSnackbar} errorMessage={languageTags.noPoisErrorText} handleClose={handleNoPoisFoundErrorSnackbar}></ErrorSnackbar>

            <SuccessSnackbar openSuccessSnack={showRouteSavedSuccessSnackbar} successMessage={languageTags.routeSavedSuccessfullyText} handleClose={handleCloseRouteSavedSuccessSnackbar}></SuccessSnackbar>
            <ErrorSnackbar openErrorSnack={showRouteSavedErrorSnackbar} errorMessage={languageTags.routeSavedErrorText} handleClose={handleCloseRouteErrorSnackbar}></ErrorSnackbar>

        </div>
    );
};

async function getLocationData(lon, lat, radius, filters, setShowNoPoisFoundErrorSnackbar, setCurrentlyLookingForPois)
{
    let locationData = new FormData();
    let data;
    locationData.append('radius', radius);
    locationData.append('lat', lat);
    locationData.append('lon', lon);
    locationData.append('filters', JSON.stringify(filters));
    await fetch('https://10.10.30.18:8444/sights', {
        method: 'post',
        body: locationData,
        credentials: 'include',
    }).then(res => res.json())
      .then(res => data = res);
    
    if(data.length !== 0 || data.length != undefined) {
        if(!filters.museums)
            data = data.filter(item => !item.properties.kinds.includes("museums"));
        if(!filters.monuments_and_memorials)
            data = data.filter(item => !item["properties"]["kinds"].includes("monuments_and_memorials"));
        if(!filters.churches)   
            data = data.filter(item => !item["properties"]["kinds"].includes("churches"));
    }

    if(data.length === 0 || data.length == undefined) { // no pois found
        setShowNoPoisFoundErrorSnackbar(true);
        setCurrentlyLookingForPois(true);
    }else
        setCurrentlyLookingForPois(false);

    return {type: "FeatureCollection", features: data};
}

export async function flyToLocation (coords, radius, newCoordinates = false, setShowNoPoisFoundErrorSnackbar, setCurrentlyLookingForPois){
    setCurrentlyLookingForPois(true);
    setShowNoPoisFoundErrorSnackbar(false);
    let locationData = new FormData();

    if(newCoordinates){
        lastCoords = coords;
        if(globalPopup !== ""){
            globalPopup.remove()
            globalPopup = "";
        }
        if(globalPopup2 !== ""){
            globalPopup2.remove()
        }
        let marker2 = new mapboxgl.Marker();
        // setMarkerCoords(coords)
        marker2.setLngLat(coords).addTo(map);
        globalPopup2 = marker2;

    }else{
        coords = lastCoords;
    }

    let z = 12;
    
    //zoom basesd on radius -> could need some work
    if(radius < 5){z = 14}else if(radius < 10){z = 10.3}else if(radius < 15){z = 9.9}else if(radius < 20){z = 9.1}else if(radius < 25){z = 8.8}else if(radius < 30){z = 8.5}else if(radius < 35){z = 8.4}else if(radius < 40){z = 8.2}else if(radius < 45){z = 8}else if(radius < 50){z = 7.9}else if(radius < 55){z = 7.75}else if(radius < 60){z = 7.55}else if(radius < 65){z = 7.4}else if(radius < 70){z = 7.3}else if(radius < 75){z = 7.2}else if(radius < 80){z = 7.1}else if(radius < 85){z = 7}else if(radius < 90){z = 6.9}else if(radius < 95){z = 6.85}else if(radius <= 100){z = 6.8}
    
    map.flyTo({
        center: [
        coords[0],
        coords[1]
        ],
        zoom: z,
        speed: 1.5,
        essential: true // this animation is considered essential with respect to prefers-reduced-motion
    });

    lastRadius = radius;

    const results = await getLocationData(coords[0], coords[1], radius, filter, setShowNoPoisFoundErrorSnackbar, setCurrentlyLookingForPois);
    
    currentGlobalResults = results;
   
    // update "attraction-points-data" source with new data
    // all layers that consume the "attraction-points-data" data source will be updated automatically
    map.getSource("attraction-points-data").setData(results);
    
}

//new Request has to be made
export async function changedFilter(coords = false, setShowNoPoisFoundErrorSnackbar, setCurrentlyLookingForPois){
    
    clearTimeout(timerID);
    
    //on filterchange call api only every 1 second 
    //(otherwise there would betoo many requests to the api if someone spams filter buttons)
    timerID = setTimeout(async () => {
        setShowNoPoisFoundErrorSnackbar(false)
        if(!coords){
            if(lastCoords.length === 0)
                return;
            else
                coords = lastCoords;
        }
        let search = false;
        //go through filter object
        for (var key of Object.keys(filter)) {
            if(filter[key] !== false){
                search = true;
            }
        }
        if(search === false){
            setShowNoPoisFoundErrorSnackbar(true);
            //empty geojson
            map.getSource("attraction-points-data").setData({type: "FeatureCollection", features: []});
            currentGlobalResults = {type: "FeatureCollection", features: []};
            return;
        }
        if(coords[0] === 11.65598 && coords[1] === 46.71503)
            return;
        const results = await getLocationData(coords[0], coords[1], lastRadius, filter, setShowNoPoisFoundErrorSnackbar, setCurrentlyLookingForPois);
        currentGlobalResults = results;
        map.getSource("attraction-points-data").setData(results);

    }, 900)

}

function addAllLayersToMap(map){

    map.loadImage(redMarker,
    function (error, image) {
        if (error) throw error;
        map.addImage('marker-red', image);
    });


    map.loadImage(blueMarker, 
    function(error, image) {
        if(error) throw error;
        map.addImage('marker-blue', image);
    });
    
    // add the data source for new a feature collection with no features
    map.addSource("attraction-points-data", {
        type: "geojson",
        data: {
            type: "FeatureCollection",
            features: []
        }
    });
    // now add the layer, and reference the data source above by name
    map.addLayer({
        id: "attraction-points-layer",
        source: "attraction-points-data",
        type: "symbol",
        layout: {
            "icon-image": "marker-red",
            "icon-padding": 0,
            "icon-allow-overlap" : true,
            "text-allow-overlap": true,
            "icon-size": 0.8
        }
    });

    map.addSource("selected-attraction-points-data", {
        type: 'geojson',
        data: {
            type: 'FeatureCollection',
            features: []
        }
    });

    map.addLayer({
        id: 'selected-attraction-points-layer',
        source: 'selected-attraction-points-data',
        type: 'symbol',
        layout: {
            'icon-image': 'marker-blue',
            "icon-padding": 0,
            "icon-allow-overlap" : true,
            "text-allow-overlap": true,
            "icon-size": 0.8
        }
    });

    map.loadImage(friendMarker,
        function (error, image) {
            map.addImage('friends-marker', image);
        }
    );
    // add the data source for new a feature collection with no features
    map.addSource("friends-points-data", {
        type: "geojson",
        data: {
            type: "FeatureCollection",
            features: []
        }
    });
    map.addLayer({
            id: "friends-points-layer",
            source: "friends-points-data",
            type: "symbol",
            layout: {
                "icon-image": "friends-marker", 
                "icon-padding": 0,
                "icon-allow-overlap" : true,
                "text-allow-overlap": true,
                "icon-size": 0.3,
                'text-field': ['get', 'title'],
                'text-font': [
                'Open Sans Semibold',
                'Arial Unicode MS Bold'
                ],
                'text-offset': [0, 1],
                'text-anchor': 'top',
               
            },
            paint: {
                "text-color": "#313638",
                "text-halo-color": "#fff",
                "text-halo-width": 4
            }
    });
}


export function setRadiusForPointerSearch (newRadius, setShowNoPoisFoundErrorSnackbar, setCurrentlyLookingForPois){
    radiusForPointerSearch = newRadius;
    if(searchByMarker)
        flyToLocation(lastCoords, radiusForPointerSearch, false, setShowNoPoisFoundErrorSnackbar, setCurrentlyLookingForPois)
}

export default BaseMap;