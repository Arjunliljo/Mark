'use strict';

class Workout {

    date = new Date();

    id = Date.now();

    constructor(coords, distance, duration) {

        this.coords = coords;
        this.distance = distance;
        this.duration = duration;
    }

    _setDescription() {

        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

        this.description = this.type[0].toUpperCase() + this.type.slice(1) + ` on ${months[this.date.getMonth()]} ${this.date.getDate()}`

    }

}

class Running extends Workout {

    type = 'running';

    constructor(coords, distance, duration, cadance) {

        super(coords, distance, duration);

        this.cadance = cadance;

        this._calcPace();

        this._setDescription();
    }

    _calcPace() {

        this.pace = this.duration / this.distance;

        return this.pace;
    }

}



class Cycling extends Workout {

    type = 'cycling';

    constructor(coords, distance, duration, elevationGain) {

        super(coords, distance, duration, elevationGain);

        this.elevationGain = elevationGain;

        this._calcSpeed();

        this._setDescription();
    }

    _calcSpeed() {

        this.speed = this.distance / (this.duration / 60);

        return this.speed;
    }
}

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
const clearAll = document.querySelector('.clear-all-workout');
const sort = document.querySelector('.sort-workout');

///////////////////////////////////////////////
///////////  Architecture
class App {

    #map;
    #mapZoom = 13;
    #mapEvent;
    #workouts = [];

    constructor() {

        // get data from browser
        this._getData();

        // get the current position on map
        this._getPosition();

        form.addEventListener('submit', this._newWorkout.bind(this));

        inputType.addEventListener('change', this._toggleElevationField)

        document.addEventListener('keydown', (e) => {
            e.key === 'Escape' && this._hideForm();
        })

        containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));

        clearAll.addEventListener('click', this._clearAll.bind(this));

        sort.addEventListener('click', this._sort.bind(this));

    }

    _getPosition() {

        navigator.geolocation.getCurrentPosition(this._loadMap.bind(this), () => {
            alert('Could not get The location');
        })

    }

    _loadMap(position) {

        const { latitude, longitude } = position.coords;

        const coords = [latitude, longitude];

        this.#map = L.map('map').setView(coords, this.#mapZoom);

        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(this.#map);

        /*
        // google map
        // Add the Google Maps tile layer to your Leaflet map
        L.tileLayer('https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
            maxZoom: 20,
            subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
            detectRetina: true,
        }).addTo(this.#map);
        */

        this.#map.on('click', this._showFrom.bind(this));

        this.#workouts.forEach(el => this.renderMark(el));
    }
    // call this to mark on map

    _showFrom(mapE) {

        this.#mapEvent = mapE;

        inputDistance.focus();

        form.classList.remove('hidden');
    }

    _hideForm() {

        //hide the form and remove values after submitting 
        inputCadence.value = inputDistance.value = inputDuration.value = inputElevation.value = '';

        // for hide the css transition 
        form.style.display = 'none';

        form.classList.add('hidden');

        // after the form hides without transition we need to set display as grid;
        setTimeout(() => form.style.display = 'grid');
    }

    _toggleElevationField() {

        inputCadence.closest('div').classList.toggle('form__row--hidden');
        inputElevation.closest('div').classList.toggle('form__row--hidden');
    }

    _newWorkout(e) {

        const isValid = (...inputs) => inputs.every(inp => Number.isFinite(inp) && inp > 0);

        e.preventDefault();

        // get data from the form

        const type = inputType.value;

        const distance = +inputDistance.value;

        const duration = +inputDuration.value;

        const { lat, lng } = this.#mapEvent.latlng;

        let workout;

        // check the data


        // check it is cycling or running
        if (type === 'running') {

            const cadance = +inputCadence.value;

            console.log(cadance / 10);

            if (!isValid(cadance, distance, duration)) {

                return alert('Enter a valid numbers');

            }
            workout = new Running([lat, lng], distance, duration, cadance);
        }
        if (type === 'cycling') {

            const elevation = +inputElevation.value

            if (!isValid(elevation, distance, duration)) {

                return alert('Enter a valid numbers');
            }

            workout = new Cycling([lat, lng], distance, duration, elevation);

        }

        // add the object into an array
        this.#workouts.push(workout);

        // render workout on the map
        this.renderMark(workout);

        // render the full list 
        this._renderWorkout(workout);

        this._hideForm();

        this._setLocalStorage();

    }

    renderMark(workout) {

        const marked = L.marker(workout.coords).addTo(this.#map).bindPopup(L.popup({
            maxWidth: 250,
            minWidth: 100,
            autoClose: false,
            closeOnClick: false,
            className: `${workout.type}-popup`,
        })).setPopupContent(`

        ${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}
        
        `).openPopup();

        marked.workoutId = workout.id;

        marked.on('popupclose', (e) => {

            const deleteWorkout = this.#workouts.find(el => el.id === marked.workoutId);

            this._removeWorkout(deleteWorkout);

            this.#map.removeLayer(marked);
        })

    }
    _removeWorkout(deleteWorkout) {

        if (!deleteWorkout) return;

        const i = this.#workouts.indexOf(deleteWorkout);

        if (i === -1) return;

        this.#workouts.splice(i, 1);

        this._renderContents();

        this._setLocalStorage();
    }

    _renderWorkout(workout) {

        let html = `
        <li class="workout workout--${workout.type}" data-id="${workout.id}">
          <h2 class="workout__title">${workout.description}</h2>
          <div class="workout__details">
            <span class="workout__icon">${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'}</span>
            <span class="workout__value">${workout.distance}</span>
            <span class="workout__unit">km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${workout.duration}</span>
            <span class="workout__unit">min</span>
          </div>
        `
        if (workout.type === 'running') {

            html += `
            <div class="workout__details">
              <span class="workout__icon">⚡️</span>
              <span class="workout__value">${workout.pace.toFixed(1)}</span>
              <span class="workout__unit">min/km</span>
            </div>
            <div class="workout__details">
              <span class="workout__icon">🦶🏼</span>
              <span class="workout__value">${workout.cadance}</span>
              <span class="workout__unit">spm</span>
            </div></li>`

        }

        if (workout.type === 'cycling') {

            html += `
            <div class="workout__details">
                <span class="workout__icon">⚡️</span>
                <span class="workout__value">${workout.speed.toFixed(1)}</span>
                <span class="workout__unit">km/h</span>
            </div>
            <div class="workout__details">
                <span class="workout__icon">⛰</span>
                <span class="workout__value">${workout.elevationGain}</span>
                <span class="workout__unit">m</span>
            </div>
            </li>
        
            `
        }

        workout.contents = html;

        this._renderContents();
        // form.insertAdjacentHTML('afterend', this._renderContents());

    }

    _renderContents() {

        if (this.#workouts.length <= 0) {

            document.querySelector('.additionol-buttons')
                .classList.add('hidden')
        }
        else {

            document.querySelector('.additionol-buttons')
                .classList.remove('hidden')
        }

        console.log(this.#workouts.length);

        const workouts = document.querySelectorAll('.workout');

        if (workouts.length >= 1) {

            workouts.forEach(el => el.remove());
        }

        this.#workouts.forEach(el => {
            form.insertAdjacentHTML('afterend', el.contents);
        })

    }

    // clearing all
    _clearAll() {

        localStorage.removeItem('workouts');
        location.reload();
    }
    _sort() {

        if (this.#workouts.length <= 1) return;

        this.#workouts.sort((a, b) => b.distance - a.distance);

        this._renderContents();
    }

    _moveToPopup(event) {

        const workout = event.target.closest('.workout');

        if (!workout) return;

        const currentWorkout = this.#workouts.find(work => {

            return work.id == workout.dataset.id;

        });

        this.#map.setView(currentWorkout.coords, this.#mapZoom + 1);

    }

    _setLocalStorage() {

        localStorage.setItem('workouts', JSON.stringify(this.#workouts));
    }

    _getData() {

        const data = JSON.parse(localStorage.getItem('workouts'))

        if (!data) return;

        this.#workouts = data;

        this._renderContents();
    }
}

const app = new App();




