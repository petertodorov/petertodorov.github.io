
function startApp() {

    const baseUrl = 'https://baas.kinvey.com/';
    const appKey = 'kid_HJgCg0Rwm';
    const appSecret = '64695c22283b40beaa844ea48b2748c2';

    const addsDiv = $('#viewAds');
    const detailSection = $('#viewDetails')
    const templates = {};

    loadTemplates();

    async function loadTemplates() {
        let [loadAddsSource, singleAddSource, showDetailsSource, singleDetailSource,
            loggedInSource, loggedOutSource] = await
            Promise.all([
                $.get('templates/loadAddsTemplate.hbs'),
                $.get('partials/singleAddPartial.hbs'),
                $.get('templates/showDetailsTemplate.hbs'),
                $.get('partials/singleDetail.hbs'),
            ]);

        Handlebars.registerPartial('singleAdd', singleAddSource);
        Handlebars.registerPartial('singleDetail', singleDetailSource);
        templates['loadAddsTemplate'] = Handlebars.compile(loadAddsSource);
        templates['loadDetailsTemplate'] = Handlebars.compile(showDetailsSource);
    }



    $(document).on({
        ajaxStart: () => $('#loadingBox').show(),
        ajaxStop: () => $('#loadingBox').fadeOut()
    });

    $('#infoBox,#errorBox').click(() => {
        $('#infoBox').hide();
        $('#errorBox').hide();
    });

    async function userLoggedIn() {

        let source = await $.get('partials/logInGeaderTemplate.hbs');
        let logInTemplate = Handlebars.compile(source);
        let nameSource = {name:localStorage.getItem('user')}

        $('#menu').html(logInTemplate(nameSource));
        attachEvents();
    }


   async function userLoggedOut() {
        let source = await $.get('partials/logedOutHeaderTemplate.hbs');
        let logOutTemplate = Handlebars.compile(source);
        $('#menu').html(logOutTemplate());
        attachEvents();
        $('#loggedInUser').hide();

    }
    function showSection(sectionId) {
        $('section').hide();
        switch (sectionId) {
            case'home':
                $('#viewHome').show();
                break;
            case'logIn':
                $('#viewLogin').show();
                break;
            case'register':
                $('#viewRegister').show();
                break;
            case'createAdd':
                $('#viewCreateAd').show();
                break;
            case'listAdd':
                $('#viewAds').show();
                loadAdds();
                break;
            case 'editAdd':
                $('#viewEditAd').show();
                break;
            case 'details':
                $('#viewDetails').show();
                break;
        }
    }

    function saveSession(result) {
        localStorage.setItem('user', result.username);
        localStorage.setItem('id', result._id);
        localStorage.setItem('token', result._kmd.authtoken);
    }

    function showInfo(message) {
        $('#infoBox').text(message);
        $('#infoBox').show();
        setTimeout(() => $('#infoBox').fadeOut(), 3000);
    }

    function showError(errorMsg) {
        let errorBox = $('#errorBox');
        errorBox.text("Error: " + errorMsg.responseJSON.description);
        errorBox.show()
    }

    let requester = (() => {

        function makeAuth(auth) {
            if (auth === 'basic') {
                return 'Basic ' + btoa(appKey + ':' + appSecret)
            } else {
                return 'Kinvey ' + localStorage.getItem('token');
            }
        }

        function makeRequest(method, module, endPoint, auth) {
            return req = {
                method,
                url: baseUrl + module + '/' + appKey + '/' + endPoint,
                headers: {
                    'Authorization': makeAuth(auth),
                    'Content-Type': 'application/json'
                }
            }
        }

        function get(module, endPoint, auth) {
            return $.ajax(makeRequest('GET', module, endPoint, auth));
        }

        function post(module, endPoint, data, auth) {
            let req = makeRequest('POST', module, endPoint, auth);
            req.data = JSON.stringify(data);
            return $.ajax(req);
        }

        function update(module, endPoint, data, auth) {
            let req = makeRequest('PUT', module, endPoint, auth);
            req.data = JSON.stringify(data);
            return $.ajax(req);
        }

        function remove(module, endPoint, auth) {
            return $.ajax(makeRequest('DELETE', module, endPoint, auth))
        }

        return {get, post, update, remove};
    })();

    showSection('home');

    if (localStorage.getItem('token') === null && localStorage.getItem('user') === null) {
        userLoggedOut()
    } else {
        userLoggedIn();
    }

    $('#buttonLoginUser').click(login);
    $('#buttonRegisterUser').click(register);
    $('#buttonCreateAd').click(createAdd);
    $('#buttonEditAd').click(updateAdd);


    function attachEvents() {
        $('#linkHome').click(() => showSection('home'));
        $('#linkLogin').click(() => showSection('logIn'));
        $('#linkLogout').click(logout);
        $('#linkRegister').click(() => showSection('register'));
        $('#linkListAds').click(() => showSection('listAdd'));
        $('#linkCreateAd').click(() => showSection('createAdd'));
    }

    async function login() {
        let form = $('#formLogin');

        let username = form.find('input[name="username"]').val();
        let password = form.find('input[name="passwd"]').val();
        let data = {username, password};
        try {
            let result = await  requester.post('user', 'login', data, 'basic');
            saveSession(result);
            userLoggedIn();
            showSection('listAdd');
            showInfo('You are logged in');
            form.trigger('reset');
        } catch (error) {
            showError(error)
        }
    }

    async function logout() {
        try {
            let result = await requester.post('user', '_logout');
            localStorage.clear();
            userLoggedOut();
            showSection('home');
            detailSection.empty();
            showInfo('Your have logged out')
        } catch (error) {
            showError(error)
        }

    }

    async function register() {
        let form = $('#formRegister');

        let username = form.find('input[name="username"]').val();
        let password = form.find('input[name="passwd"]').val();
        let data = {username, password};
        try {
            let result = await  requester.post('user', '', data, 'basic');
            saveSession(result);
            userLoggedIn();
            form.trigger('reset');
            showSection('listAdd');
            showInfo('You are registered');
        } catch (e) {
            showError(e)
        }

    }

    async function loadAdds() {
        console.log('in load');
        // addsDiv.empty();
        let data = await requester.get('appdata', 'posts');
        //checking if authorised to change adds
        data.forEach(add => {
            if (add._acl.creator === localStorage.getItem('id')) {
                add.isAuthor = true;
            }
        })
        let context = {data};

        let htmlToAdd = templates.loadAddsTemplate(context);
        addsDiv.html(htmlToAdd);
        //find all buttons of a type and attach listeners
        let detailsButtons = $(addsDiv).find('.add-box').find('.details');
        detailsButtons.click(showDetails)
        let editButtons = $(addsDiv).find('.add-box').find('.edit');
        editButtons.click(openEditAdd)
        let deleteButtons = $(addsDiv).find('.add-box').find('.delete');
        deleteButtons.click(deleteAdd)
    }

    async function createAdd() {
        let form = $('#formCreateAd');

        let title = form.find($('input[name=title]')).val();
        let description = form.find($('textarea[name=description]')).val();
        let date = (new Date().toLocaleDateString("en-US"));
        let publisher = localStorage.getItem('user');
        let price = Number(form.find($('input[name=price]')).val());
        let image = form.find($('input[name=image]')).val();

        if (title.length === 0) {
            alert('Title cannot be empty');
            return;
        }
        if (Number.isNaN(price) || price <= 0) {
            alert('Enter valid price');
            return;
        }
        let newAdd = {title, description, date, publisher, price, image};
        try {
            let result = await requester.post('appdata', 'posts', newAdd);
            showSection('listAdd')
            form.trigger('reset');
            showInfo('You created an add');
        } catch (error) {
            showError(error)
        }
    }

    async function showDetails() {
        console.log('in show details');

        let currentAddId = $(this).parent().attr('id');
        let add = await requester.get('appdata', `posts/${currentAddId}`);
        let html = templates.loadDetailsTemplate(add);
        detailSection.append(html);
        let backButton = detailSection.find('.backBtn');
        backButton.click(() => showSection('listAdd'))
        showSection('details');
    }

    async function openEditAdd() {
        let currentAddId = $(this).parent().attr('id');
        let add = await requester.get('appdata', `posts/${currentAddId}`)
        let form = $('#viewEditAd');
        form.find($('input[name=id]')).val(add._id);
        form.find($('input[name=image]')).val(add.image);
        form.find($('input[name=publisher]')).val(add.publisher);
        form.find($('input[name=title]').val(add.title));
        form.find($('textarea[name=description]').val(add.description));
        form.find($('input[name=datePublished]')).val(add.date);
        form.find($('input[name=price]').val(add.price));
        showSection('editAdd');
    }

    async function updateAdd() {
        let form = $('#viewEditAd');
        let id = form.find($('input[name=id]')).val();
        let image = form.find($('input[name=image]')).val();
        let publisher = form.find($('input[name=publisher]')).val();
        let title = form.find($('input[name=title]')).val();
        let description = form.find($('textarea[name=description]')).val();
        let date = form.find($('input[name=datePublished]')).val();
        let price = form.find($('input[name=price]')).val();
        if (title.length === 0) {
            alert('Title cannot be empty');
            return;
        }
        if (Number.isNaN(price) || price <= 0) {
            alert('Enter valid price');
            return;
        }
        let editedAdd = {id, image, publisher, title, description, date, price};
        console.log(editedAdd.date);
        try {
            let result = await requester.update('appdata', `posts/${editedAdd.id}`, editedAdd);
            showSection('listAdd')
            showInfo('Add has been updated')
        } catch (error) {
            showError(error)
        }
    }

    async function deleteAdd() {
        try {
            let id = $(this).parent().attr('id');
            let result = await requester.remove('appdata', `posts/${id}`);
            showSection('listAdd');
            showInfo('Add is deleted');
        } catch (error) {
            showError(error)
        }
    }


    // function navigateTo(event) {
    //     $('section').hide();
    //     let target = $(event.target).attr('data-target');
    //     console.log(target);
    //     $('#' + target).show()
    // }
    // $('header').find('a[data-target]').click(navigateTo);

}