function increment(selector) {
    let button = $('#btnIncrement');
    let addBtn = $('#addMe');
    let clearBtn = $('#clearMe');
    let listOutput = $('#listOfNums');

    $(selector).append(
        '<p class="col-md-6 m-auto bg-success text-white text-center" id="valInput">0</p>'
    )

    button.on('click', addElementsToList);
    addBtn.on('click', incrementMe);
    clearBtn.on('click', clearMe)



    function incrementMe() {
        let input = +$('#valInput').text();
        input += 1;
        $('#valInput').text(input);
    }

    function clearMe() {
        console.log('in Clear');
        listOutput.empty();
        $('#valInput').text(0);

    }

    function addElementsToList() {
        let input = +$('#valInput').text();
        listOutput.empty();
        for (let i = 1; i <= input; i++) {
            $(listOutput).append(
                `<li class="list-group-item">${i}</li>`
            )
        }
    }
}