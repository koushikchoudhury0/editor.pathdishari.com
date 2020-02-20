class ValidationError extends Error {
    constructor(message) {
        super(message);
        this.name = "ValidationError";
    }
}

var uploadArr = [];


const PAPER_TYPE_MOCK = 1, PAPER_TYPE_SUBJECT = 2;


$(document).ready(() => {
    
    if (!Cookies.get("token")){
        window.location.replace("/");
        return;
    }
    //Common execution for all level 1 pages on admin section
    $("header").load("/content/layout/navbar.html", () => {        
        $("ul.tabs li:eq(1) a").addClass("active");
        $("main").css({"margin-top": $("header").height()});
        $(".slide-out-top").prepend('\
            <div class="row" style="margin: 0; padding: 0; margin: 0">\
                <div class="col s12 sectorSelectContainer">\
                    <select id="sectorList">\
                        <option disabled selected>Choose Sector</option>\
                    </select>\
                </div>\
            </div>\
        ');
        $("#sectorList").on("change", () => {
            $("#sectorList").formSelect();
            fetchExams($("#sectorList").formSelect('getSelectedValues')[0]);
        });
        $(".subheader").html("Existing Exams<i style=\"margin-right: 10px\" class='material-icons'>format_shapes</i>"); 
        /*$(".sidenav").on("click", "#test", () => {
            console.log($(this).parent().prop);            
            //$(this).css({"display": "none"});
        })*/
        loadMaterialModalPromise(".modalContainer").then(() => {
            M.AutoInit();
            $('.characterCountable').characterCounter(); 
            fetchSectors();
            //fetchExams();           
            //setYearList();  
            //openUploadWindow();
            /*
            For Testing Sidenav elements
            $("ul.sidenav").append(getSidenavElementBody("test", "test"));
            $("ul.sidenav").append(getSidenavElementBody("test2", "test2"));
            */
        });
        
    });

    $("#uploadInput").on('change', ()=>{
        handleExcelImport();
    });

    $("#confirmCheck").change(()=>{
        if ($("#confirmCheck").prop("checked")){
            $("#excelUploadButton").removeAttr("disabled");
        } else {
            $("#excelUploadButton").attr("disabled", "true");
        }
    })
    
});



var fetchSectors = () => {
    console.log("fetching sectors");
    engageProgress({
        msg: "Fetching Sectors ..."
    });
    $.ajax({
        type: "POST",
        url: "https://33qo10kq34.execute-api.ap-south-1.amazonaws.com/prod/read-sectors",
        headers: {
            "Authorization": Cookies.get("token")
        }
    }).done((responseBody) => {        
        console.log(responseBody);
        if (responseBody.statusCode==1){            
            dismissDialog();
            $("#sectorList").empty();
            $("#sectorList").append("<option disabled selected>Choose Sector</option>");
            if (responseBody.sectors.length==0){                
                M.toast({html: "No Sectors to fetch"});
            } else {                                
                responseBody.sectors.forEach((v, i) => {    
                    console.log("Adding: ", v.sectorName);                                                    
                    $("#sectorList").append("<option data='"+v.sectorName+"'>"+v.sectorName+"</option>");
                });                                             
            }
            $("#sectorList").formSelect();
        } else {
            console.log(JSON.stringify(responseBody));
            engageDialog({
                head: "Cannot fetch any more!",
                body: "Something went wrong"
            });    
        }
    }).fail((xhr) => {
        console.log("failed: ", xhr.status);
        if (xhr.status === 403 || xhr.status === 401){
            Cookies.remove("token");
            window.location.replace("/");
        } else {
            engageDialog({
                head: "Cannot fetch sectors",
                body: "Something went wrong."
            });
        }
    });
}

/* var setYearList = (presentYear = parseInt(new Date().getFullYear())) => {
    
    $("#viewYearSelect").html("");
    $("#createYearSelect").html("");
    for (var i=presentYear-10; i<presentYear; i++){
        $("#viewYearSelect").append("<option value=\""+i+"\">"+i+"</option>");
        $("#createYearSelect").append("<option value=\""+i+"\">"+i+"</option>");     
    }
    $("#viewYearSelect").append("<option selected value=\""+i+"\">"+i+"</option>");
    $("#createYearSelect").append("<option selected value=\""+i+"\">"+i+"</option>");     
    for (var i=presentYear+1; i<=presentYear+10; i++){
        $("#viewYearSelect").append("<option value=\""+i+"\">"+i+"</option>");
        $("#createYearSelect").append("<option value=\""+i+"\">"+i+"</option>");     
    }
    $("#viewYearSelect").formSelect();
    $("#createYearSelect").formSelect();
    
} */

var typeSelect = (elem) => {
    switch($(elem).attr("id")){
        case "typeMock":
            $(".paperModelContainer").hide();
            break;
        case "typeSubject":
            console.log("sbject");
            $(".paperModelContainer").show();
            break;
    }
}

var fetchExams = (sectorName) => {
    console.log("fetching exam names for sector: ", sectorName);
    engageProgress({
        msg: "Fetching exams ..."
    });
    $.ajax({
        type: "POST",
        url: "https://33qo10kq34.execute-api.ap-south-1.amazonaws.com/prod/read-exam-names",
        headers: {
            "Authorization": Cookies.get("token")
        },
        data: JSON.stringify({
            sectorName: sectorName
        })
    }).done((responseBody) => {        
        console.log(responseBody);
        if (responseBody.statusCode==1){            
            dismissDialog();
            $(".sidenavElement").remove();
            if (responseBody.examNames.length==0){                
                M.toast({html: "No exams to fetch"});
            } else {                
                responseBody.examNames.forEach((v, i) => {                
                    //$("#examSelector").append("<option>"+v.abbreviation+"</option>");
                    $("ul.sidenav").append(getSidenavElementBody(v.examId, v.abbreviation));
                });                             
            }
        } else {
            console.log(JSON.stringify(responseBody));
            engageDialog({
                head: "Cannot fetch any more!",
                body: "Something went wrong"
            });    
        }
    }).fail((xhr) => {
        console.log("failed: ", xhr.status);
        if (xhr.status === 403 || xhr.status === 401){
            Cookies.remove("token");
            window.location.replace("/");
        } else {
            engageDialog({
                head: "Cannot fetch exams",
                body: "Something went wrong."
            });
        }
    });
}

var createPaper = () => {
    $("#createYearSelect").formSelect();
    paperData = {
        examId: $("#selectedExamId").attr("value"),
        paperName: $("#paperNameText").val(),        
        paperType: $("#typeMock").prop("checked")?PAPER_TYPE_MOCK:PAPER_TYPE_SUBJECT,
        modelName: $("#paperModelText").val(),
        modelQuestionCount: $("#paperModelQuestionCount").val(),
        modelTimeout: $("#paperModelTime").val(),
        modelMarks:$("#paperModelMarks").val(),
        modelThreshold: $("#paperModelThreshold").val(),
        //targetYear: parseInt($("#createYearSelect").formSelect('getSelectedValues')[0]),
        isFree: $("#freeCheckbox").prop("checked")?1:0,
        publicationDate: $("#pubDate").val()
    }
    console.log(paperData, "Validating.....");    
    try{
        if (paperData.examId.length<60) throw new ValidationError("Exam Id is invalid");
        if (paperData.paperName.trim().length<5 /*|| !new RegExp("^[0-9A-Z\. a-z]+$").test(paperData.paperName)*/) throw new ValidationError("Paper name should be more than 5 characters and only contain alphanumeric characters");
        if (paperData.paperTimeout < 1) throw new ValidationError("Timeout should be positive");
        if (paperData.paperType<0 || paperData.paperType>2 ) throw new ValidationError("Invalid type");        
        if (paperData.paperType==2) if (paperData.modelName.trim().length<5 /*|| !new RegExp("^[0-9A-Z\. a-z]+$").test(paperData.modelName)*/) throw new ValidationError("Model name should be more than 5 characters and only contain alphanumeric characters.");
        if (paperData.paperType==2) if (paperData.modelQuestionCount < 1 || paperData.modelQuestionCount > 100) throw new ValidationError("No.of question should be positive with a maximum of 100");
        if (paperData.targetYear<2000) throw new ValidationError("Year more than 2000 must be specified");
        if (paperData.isFree<0 || paperData.isFree>1) throw new ValidationError("Cost of this paper is left undecided");
        if (!paperData.publicationDate) throw new ValidationError("Expected Publication Date must be chosen");
    } catch (err) {
        console.log(err);
        engageDialog({
            head: "Invalid Paper Configured!",
            body: (err instanceof ValidationError)?err.message:"Something went terribly wrong! Contact the administrators"
        });
        return;
    }    
    /*if (!isNewPaperDataValid(paperData)){
        console.log("Illegal New Content");
        engageDialog({
            head: "Cannot create Paper",
            body: "Paper data is not valid. Please make sure that you've entered both <b>Exam name</b> and <b>Paper name</b>"
        });
        return;   
    }*/
    
    
    console.log("Creating Paper..");
    var requestBody = 
    engageProgress({
        msg: "Creating new paper ..."
    });
    $.ajax({
        type: "POST",
        url: "https://33qo10kq34.execute-api.ap-south-1.amazonaws.com/prod/create-paper",
        data: JSON.stringify(paperData),
        headers: {
            "Authorization": Cookies.get("token")
        }
    }).done((responseBody) => {  
        console.log(responseBody);                      
        if (responseBody.statusCode==1){            
            $("#inputContainer").modal('close');
            dismissDialog();
            $("#paperList li:eq(0)").after(getPaperBody(responseBody.createdPaper));
            M.AutoInit();
            M.toast({html: 'Paper created'});
            //remove data from input fields
            $("#paperNameText").val("");   
            M.updateTextFields();
            $('.characterCountable').characterCounter();             
            //add data to list
            M.toast({html: "Paper Created"});
        } else {
            engageDialog({
                head: "Cannot create paper",
                body: responseBody.cause==300?"Paper with same name for chosen exam already exists":200?"Invalid components were provided":"Something went wrong"
            });
        }
    }).fail((xhr) => {
        console.log("failed: ", xhr.status);
        if (xhr.status === 403 || xhr.status === 401){
            Cookies.remove("token");
            window.location.replace("/");
        } else {
            engageDialog({
                head: "Cannot fetch exams",
                body: "Something went wrong."
            });
        }
    });
}

var fetchPapers = (examId, examAbbreviation) => {
    console.log("Fetching paers");
    engageProgress({
        msg: "Fetching "+examAbbreviation+" papers"// for "+targetYear+" ..."
    });
    $.ajax({
        type: "POST",
        url: "https://33qo10kq34.execute-api.ap-south-1.amazonaws.com/prod/read-paper-names-by-exam-name",
        headers: {
            "Authorization": Cookies.get("token")
        },
        data: JSON.stringify({
            examId: examId/* ,
            targetYear: targetYear */
        })
    }).done((responseBody) => {        
        console.log(responseBody);
        $("#paginatorContainer").empty();
        if (responseBody.statusCode==1){            
            dismissDialog();
            if (responseBody.papers.length==0){                
                M.toast({html: examAbbreviation+" has no existing papers"});                
            }
            $("#paperList").empty().append('<li class="collection-header"><h4>Existing Papers</h4></li>').css({"visibility": "visible"});                
            responseBody.papers.forEach((v, i) => {      
                console.log(v.creation);                              
                $("#paperList").append(getPaperBody(v).toString());
                M.AutoInit();
                console.log(v);
            });
            $("#fab").fadeIn();
            $(".container.placeholder").fadeOut("fast", () => {
                $(".container.primary").fadeIn("fast");
            });
            $(".tooltipped").tooltip();
            $(".datepicker").datepicker({
                container: "body",
                format: "d mmmm yyyy"
            });
            if (responseBody.exclusiveStartKey){
                $("#paginatorContainer").append(`<p id="paginator" data-key='${JSON.stringify(responseBody.exclusiveStartKey)}' onclick=\'fetchMorePapers("${examId}", "${examAbbreviation}", this)\'>Load More</p>`)
            }
        } else {
            console.log(JSON.stringify(responseBody));
            engageDialog({
                head: "Cannot fetch any more!",
                body: "Something went wrong"
            });    
        }
    }).fail((xhr) => {
        console.log("failed: ", xhr.status);
        if (xhr.status === 403 || xhr.status === 401){
            Cookies.remove("token");
            window.location.replace("/");
        } else {
            engageDialog({
                head: "Cannot fetch papers",
                body: "Something went wrong."
            });
        }
    });
}

var fetchMorePapers = (examId, examAbbreviation, elem) => {
    console.log("Fetching paers");
    engageProgress({
        msg: "Fetching more "+examAbbreviation+" papers"
    });
    console.log($(elem).attr("data-key"));
    $.ajax({
        type: "POST",
        url: "https://33qo10kq34.execute-api.ap-south-1.amazonaws.com/prod/read-paper-names-by-exam-name",
        headers: {
            "Authorization": Cookies.get("token")
        },
        data: JSON.stringify({
            examId: examId,
            exclusiveStartKey: JSON.parse($(elem).attr("data-key"))
        })
    }).done((responseBody) => {        
        console.log(responseBody);
        $("#paginatorContainer").empty();
        if (responseBody.statusCode==1){            
            dismissDialog();
            if (responseBody.papers.length==0){                
                M.toast({html: examAbbreviation+" has no existing papers"});                
            }                           
            responseBody.papers.forEach((v, i) => {      
                console.log(v.creation);                              
                $("#paperList").append(getPaperBody(v).toString());
                M.AutoInit();
                console.log(v);
            });
            $("#fab").fadeIn();
            $(".container.placeholder").fadeOut("fast", () => {
                $(".container.primary").fadeIn("fast");
            });
            $(".tooltipped").tooltip();
            $(".datepicker").datepicker({
                container: "body",
                format: "d mmmm yyyy"
            });
            if (responseBody.exclusiveStartKey){
                $("#paginatorContainer").append(`<p id="paginator" data-key='${JSON.stringify(responseBody.exclusiveStartKey)}' onclick=\'fetchMorePapers("${examId}", "${examAbbreviation}", this)\'>Load More</p>`)
            }
        } else {
            console.log(JSON.stringify(responseBody));
            engageDialog({
                head: "Cannot fetch any more!",
                body: "Something went wrong"
            });    
        }
    }).fail((xhr) => {
        console.log("failed: ", xhr.status);
        if (xhr.status === 403 || xhr.status === 401){
            Cookies.remove("token");
            window.location.replace("/");
        } else {
            engageDialog({
                head: "Cannot fetch papers",
                body: "Something went wrong."
            });
        }
    });
}

var isNewPaperDataValid = (paperData) => {
    try{
        if (paperData.examId.length<60) throw new ValidationError("Exam Id is invalid");
        if (paperData.paperName.trim().length<5 || !new RegExp("^[0-9A-Z\. a-z]+$").test(paperData.paperName)) throw new ValidationError("Paper name should be more than 5 characters and only contain alphanumeric characters");
        if (paperData.paperTime < 1) throw new ValidationError("Timeout should be positive");
        if (paperData.paperType<0 || paperData.paperType>2 ) throw new ValidationError("Invalid type");
        if (paperData.modelName.trim().length<5 || !new RegExp("^[0-9A-Z\. a-z]+$").test(paperData.modelName)) throw new ValidationError("Model name should be more than 5 characters and only contain alphanumeric characters");
    } catch (err) {
        console.log(err);
        return false;
    }
    /*var str = $("#paperNameText").val();
    if (!(!str?false:str.trim().length>1?true:false)){
        console.log("hey");
        return false;    
    }     
    if (!new RegExp("^[0-9A-Z\. a-z]+$").test(str)) return false;
    //if (!new RegExp("[^\-]$").test(str)) return false;
    //if (!new RegExp("^[^\-]").test(str)) return false;
    */    
    return true;
}

var getPaperBody = (paper) => {
    return `<li class="collection-item paperItem">
        <div class="paperItemChild"  style="overflow: visible">
            <div>${paper.paperName}
                <a  class="secondary-content waves-effect composeNavigater dropdown-trigger" data-target="${paper.paperId}">
                    <i class="material-icons">more_vert</i>
                </a>
            </div>
            <div>
                <x>ID</x><y id="paperIdText">${paper.paperId}</y>
            </div>
            <ul id="${paper.paperId}" class="dropdown-content">
                <li><a class="dropdownText" target="_blank" href="https://pathdishari.com/public-paper-template/${paper.paperId}.xlsx">Download Template</a></li>
                <li><a class="dropdownText" onclick="openUploadWindow('${paper.paperId}', '${paper.paperName}')">Upload Excel</a></li>
                <li><a class="dropdownText" target="_blank" href="./makePaper.html?paperId=${paper.paperId}">Manage Questions</a></li>
                <li><a class="dropdownText" onclick="startEditingPaper('${paper.paperId}', '${paper.paperName}')">Edit</a></li>                                
                ${paper.published==0?`<li><a class="dropdownText expendable" href="#!" onclick="publishPaper(this, '${paper.paperId}', '${paper.paperName}')">Publish</a></li>`:``}
            </ul>
            <div>
                <p class="paperConfigData"><span class="customBadge paperType">${paper.paperType==1?'mock':'topic wise'}</span><span class="customBadge paperCost">${paper.isFree==1?'free':'paid'}</span><span class="customBadge paperStatus">${paper.published==1?'published':'draft'}</span></p>
                <p class="paperConfigData time"><i class="material-icons">access_time</i>${new Date(paper.creationTime)}</p>
            </div>
        </div>
    </li>`
}

var openUploadWindow = (paperId, paperName) => {
    console.log("Opening upload window");
    $(".upload-window .subheading#uploadExamName").html("<a>Paper Name: </a>"+paperName);
    $(".upload-window .subheading#uploadPaperId").html("<a>Paper Id: </a>"+paperId);
    $("#excelUploadButton").attr("onclick", `uploadQuestionSet()`);
    $("#uploadWindow").modal();
    restoreUploadWindow();
    $("#uploadWindow").modal('open');
}

var publishPaper = (element, paperId, paperName) => {
    console.log("Publishing paper with id: ", paperId);
    try{
        if (paperId.length<60) throw new ValidationError("Insuffcoent PaperId length");
    } catch (err) {
        engageDialog({
            head: "Oops!",
            body: "Something is off about this paper. Refresh and try again after a few momoents, if the problem perists contact the Administrators"
        });
        return;
    }
    engageProgress({
        msg: "Publishing "+paperName    
    });
    $.ajax({
        type: "POST",
        url: "https://33qo10kq34.execute-api.ap-south-1.amazonaws.com/prod/publish-paper",
        headers: {
            "Authorization": Cookies.get("token")
        },
        data: JSON.stringify({
            paperId: paperId
        })
    }).done((responseBody) => {        
        console.log(responseBody);
        if (responseBody.statusCode==1){            
            dismissDialog();
            M.toast({html: "Paper published"});
            $(element).closest(".paperItemChild").find(".paperStatus").text("Published");
            $(element).parent().remove();
        } else {
            console.log(JSON.stringify(responseBody));
            engageDialog({
                head: "Oops!",
                body: "Something went wrong"
            });    
        }
    }).fail((xhr) => {
        console.log("failed: ", xhr.status);
        if (xhr.status === 403 || xhr.status === 401){
            Cookies.remove("token");
            window.location.replace("/");
        } else {
            engageDialog({
                head: "Cannot publish",
                body: "Something went wrong."
            });
        }
    });
}

var getSidenavElementBody = (examId, examAbbreviation) => {
    return '\
    <li>\
        <div onclick="startFetchingPapers(this, \''+examId+'\', \''+examAbbreviation+'\')" class="waves-effect sidenavElement">\
            <a class="examAbbreviation">'+examAbbreviation+'</a>\
        </div>\
        <li><div style="margin-top: 0" class="divider"></div></li>\
    </li>\
    ';
}

var startFetchingPapers = (element, examId, examAbbreviation) => {    
    $(".sidenavElement").removeClass("active");
    $(element).addClass("active");
    $("#examNamePreview").text(examAbbreviation);
    $("#examNamePreview2").text(examAbbreviation);
    $("#inputContainer #selectedExamId").attr("value", examId);        
    $("#viewYearSelect").formSelect();    
    fetchPapers(examId/* , $("#viewYearSelect").formSelect('getSelectedValues')[0] */, examAbbreviation);    
}

var triggerFetchPaper = () => {
    $(".sideNavElement.active").trigger("click");
}

var handleExcelImport = () => {
    //Reference the FileUpload element.
    var fileUpload = $("#uploadInput")[0];
 
    //Validate whether File is valid Excel file.
    var regex = /^([a-zA-Z0-9\s_\\.\-:])+(.xls|.xlsx)$/;
    if (regex.test(fileUpload.value.toLowerCase())) {
        if (typeof (FileReader) != "undefined") {
            var reader = new FileReader();

            //For Browsers other than IE.
            if (reader.readAsBinaryString) {
                reader.onload = function (e) {
                    ProcessExcel(e.target.result);
                };
                reader.readAsBinaryString(fileUpload.files[0]);
            } else {
                //For IE Browser.
                reader.onload = function (e) {
                    var data = "";
                    var bytes = new Uint8Array(e.target.result);
                    for (var i = 0; i < bytes.byteLength; i++) {
                        data += String.fromCharCode(bytes[i]);
                    }
                    ProcessExcel(data);
                };
                reader.readAsArrayBuffer(fileUpload.files[0]);
            }
        } else {
            alert("This browser does not support HTML5.");
        }
    } else {
        alert("Please upload a valid Excel file.");
    }
}

function ProcessExcel(data) {
    //Read the Excel File data.
    var workbook = XLSX.read(data, {
        type: 'binary'
    });

    //Fetch the name of First Sheet.
    var firstSheet = workbook.SheetNames[0];

    //Read all rows from First Sheet into an JSON array.
    var excelRows = XLSX.utils.sheet_to_row_object_array(workbook.Sheets[firstSheet]);
    
    console.log(excelRows);
    uploadArr = [];

    //Create a HTML Table element.
    var table = $("<table class=\"striped\"/>");
    table[0].border = "1";

    //Add the header row.
    var row = $(table[0].insertRow(-1));

    //Add the header cells.
    var headerCell = $("<th />");
    headerCell.html("#");
    row.append(headerCell);

    var headerCell = $("<th />");
    headerCell.html("SECTION");
    row.append(headerCell);

    var headerCell = $("<th />");
    headerCell.html("QUESTION ID");
    row.append(headerCell);

    var headerCell = $("<th style='min-width: 500px;'/>");
    headerCell.html("QUESTION");
    row.append(headerCell);

    var headerCell = $("<th />");
    headerCell.html("TYPE");
    row.append(headerCell);

    var headerCell = $("<th />");
    headerCell.html("OPTION 1");
    row.append(headerCell);

    var headerCell = $("<th />");
    headerCell.html("OPTION 2");
    row.append(headerCell);

    var headerCell = $("<th />");
    headerCell.html("OPTION 3");
    row.append(headerCell);

    var headerCell = $("<th />");
    headerCell.html("OPTION 4");
    row.append(headerCell);

    var headerCell = $("<th />");
    headerCell.html("MCQ SOLUTION");
    row.append(headerCell);

    var headerCell = $("<th />");
    headerCell.html("DESC SOLUTION");
    row.append(headerCell);

    var headerCell = $("<th />");
    headerCell.html("EXPLANATION");
    row.append(headerCell);

    var headerCell = $("<th />");
    headerCell.html("POSITIVE");
    row.append(headerCell);

    var headerCell = $("<th class='table-last'/>");
    headerCell.html("NEGATIVE");
    row.append(headerCell);

    var uploadableArr = [];

    //Add the data rows from Excel file.
    for (var i = 0; i < excelRows.length; i++) {
        
        if (Object.keys(excelRows[i]).length < 10){
            M.toast({html: "Error: Question "+(i+1)+" has atleast one blank field"});
            return;
        }

        uploadableArr[i] = {
            questionId: excelRows[i].ID,
            questionText: excelRows[i].TEXT,
            contentImagesAvailable: 0,
            solutionType: parseInt(excelRows[i].TYPE),
            optionImagesAvailable: 0,
            optionTexts: [excelRows[i].OPTION_1, excelRows[i].OPTION_2, excelRows[i].OPTION_3, excelRows[i].OPTION_4],
            solution: excelRows[i].TYPE=='1'?excelRows[i].MCQ_SOL.split(",").map(x=>+x):[excelRows[i].DESC_SOL],
            explanation: excelRows[i].EXPLANATION?excelRows[i].EXPLANATION:"Unavailable",
            positiveMarks: excelRows[i].POS_MARK,
            negativeMarks: excelRows[i].NEG_MARK
        }

        if (isNaN(uploadableArr[i].solution)){
            M.toast({html: "Error: Question "+(i+1)+" has non numeric solution for MCQ"});
            return;
        }

        //Add the data row.
        var row = $(table[0].insertRow(-1));

        //Add the data cells.
        var cell = $("<td />");
        cell.html(i+1);
        row.append(cell);
        
        var cell = $("<td />");
        cell.html(excelRows[i].SECTION);
        row.append(cell);

        cell = $("<td class='questionIdText'/>");
        cell.html(excelRows[i].ID);
        row.append(cell);

        cell = $("<td  class='questionText'/>");
        cell.html(excelRows[i].TEXT);
        row.append(cell);

        cell = $("<td />");
        cell.html(excelRows[i].TYPE=='1'?'MCQ':'DESC');
        row.append(cell);

        //console.log(excelRows[i]);

        cell = $("<td />");
        cell.html(excelRows[i].OPTION_1);
        row.append(cell);

        cell = $("<td />");
        cell.html(excelRows[i].OPTION_2);
        row.append(cell);

        cell = $("<td />");
        cell.html(excelRows[i].OPTION_3);
        row.append(cell);

        cell = $("<td />");
        cell.html(excelRows[i].OPTION_4);
        row.append(cell);

        cell = $("<td />");
        cell.html(excelRows[i].MCQ_SOL);
        row.append(cell);


        cell = $("<td />");
        cell.html(excelRows[i].DESC_SOL);
        row.append(cell);

        
        cell = $("<td />");
        cell.html(excelRows[i].EXPLANATION);
        row.append(cell);

        cell = $("<td />");
        cell.html(excelRows[i].POS_MARK);
        row.append(cell);

        cell = $("<td class='table-last' />");
        cell.html(excelRows[i].NEG_MARK);
        row.append(cell);
    }

    var dvExcel = $("#excelDump");
    dvExcel.html("");
    dvExcel.append(table);
    M.toast({html: "Questions Loaded"});
    var pieces = Math.ceil(uploadableArr.length/20);
    var qsnCount = 0;
    for (var s=0; s<pieces; s++){        
        uploadArr[s] = uploadableArr.slice(s*20, s*20+20);
        qsnCount += uploadArr[s].length;
    }
    $("#qsnCountLabel").html("I confirm "+qsnCount+" questions depicted above are in compliance with the mentioned rules");
    $("#confirmCheck").removeAttr("disabled");
    console.log(uploadArr);
};

var restoreUploadWindow = () => {
    $("#excelDump").html("");
    $("#uploadInput").val(null);    
    $("#qsnCountLabel").html("Awaiting file selection");
    $("#confirmCheck").prop("checked", false).attr("disabled", true);
    $("#excelUploadButton").attr("disabled", true);
}

var uploadQuestionSet = () => {
    //https://33qo10kq34.execute-api.ap-south-1.amazonaws.com/prod/admin-upload-question-set
    engageProgress({
        msg: "Uploading Question Set"    
    });
    $.ajax({
        type: "POST",
        url: "https://33qo10kq34.execute-api.ap-south-1.amazonaws.com/prod/admin-upload-question-set",
        headers: {
            "Authorization": Cookies.get("token")
        },
        data: JSON.stringify({
            uploadArr: uploadArr
        })
    }).done((responseBody) => {        
        console.log(responseBody);
        dismissDialog();
        if (responseBody.statusCode==1){   
            M.toast({html: "Upload Complete"});         
            $("#uploadWindow").modal('close');
        } else {            
            engageDialog({
                head: "Oops!",
                body: "Something went wrong"
            });    
        }
    }).fail((xhr) => {
        console.log("failed: ", xhr.status);
        if (xhr.status === 403 || xhr.status === 401){
            Cookies.remove("token");
            window.location.replace("/");
        } else {
            engageDialog({
                head: "Cannot publish",
                body: "Something went wrong."
            });
        }
    });
}

var startEditingPaper = (paperId, paperName) => {
    engageProgress({
        msg: `Fetching ${paperName}...`
    });
    $.ajax({
        type: "POST",
        url: "https://33qo10kq34.execute-api.ap-south-1.amazonaws.com/prod/admin-read-paper",
        headers: {
            "Authorization": Cookies.get("token")
        },
        data: JSON.stringify({
            paperId: paperId
        })
    }).done((responseBody) => {        
        console.log(responseBody);
        dismissDialog();
        if (responseBody.statusCode==1){   
            console.log("Opening edit window");                      
            $("#editWindow .subheading#editPaperId").html("<a>Paper Id: </a>"+responseBody.paperData.paperId);
            $("#editWindow #editPaperName").val(responseBody.paperData.paperName);
            $("#editWindow #editThreshold").val(responseBody.paperData.threshold);
            $("#editWindow #editFreeCheckbox").prop("checked", !!responseBody.paperData.isFree);            
            /* delete responseBody.paperData.paperName;
            delete responseBody.paperData.isFree;
            delete responseBody.paperData.paperId;
            delete responseBody.paperData.published;
            delete responseBody.paperData.paperType;
            delete responseBody.paperData.examAbbreviation;
            delete responseBody.paperData.creationTime;
            delete responseBody.paperData.questions; */
            var filteredPaperData = {
                "Timeout": `${responseBody.paperData.timeout} minutes`,
                "Expected Publication": `${responseBody.paperData.publicationDate}`
            }
            if (responseBody.paperData.paperType == PAPER_TYPE_SUBJECT){
                filteredPaperData["#Questions"] = responseBody.paperData.questions[0].questionList.length;
                filteredPaperData["Model Name"] = responseBody.paperData.questions[0].sectionName;
                filteredPaperData["Total Marks"] = responseBody.paperData.questions[0].marks;
                filteredPaperData["Section Timeout"] = `${responseBody.paperData.questions[0].timeout} minutes`;
            }
            $("#editWindow #dataDump").empty();
            for (key in filteredPaperData){
                $("#editWindow #dataDump").append(`<p class="subheading"><a>${key}: </a>${filteredPaperData[key]}</p>`);
            }
            M.updateTextFields();
            $("#editPaperButton").attr("onclick", `updatePaper('${paperId}')`);  
            $("#editWindow").modal();            
            $("#editWindow").modal('open');
        } else {            
            engageDialog({
                head: "Oops!",
                body: "Something went wrong"
            });    
        }
    }).fail((xhr) => {
        console.log("failed: ", xhr.status);
        if (xhr.status === 403 || xhr.status === 401){
            Cookies.remove("token");
            window.location.replace("/");
        } else {
            engageDialog({
                head: "Cannot publish",
                body: "Something went wrong."
            });
        }
    });    
}

var updatePaper = (paperId) => {
    var updateData = {
        paperId: paperId,
        paperName: $("#editPaperName").val(),
        thresholdMarks: Number($("#editThreshold").val()),
        isFree: Number($("#editFreeCheckbox").prop("checked"))
    }
    if (updateData.thresholdMarks<=0){
        M.toast({html: "Error: Threshold marks must be positive"});
        return;
    }
    console.log("Uploading: ", updateData);
    engageProgress({
        msg: `Updating....`
    });
    $.ajax({
        type: "POST",
        url: "https://33qo10kq34.execute-api.ap-south-1.amazonaws.com/prod/admin-update-paper",
        headers: {
            "Authorization": Cookies.get("token")
        },
        data: JSON.stringify(updateData)
    }).done((responseBody) => {        
        console.log(responseBody);
        dismissDialog();
        if (responseBody.statusCode==1){   
            M.toast({html: "Paper Updated"});
            //TODO: update view element
            $("#editWindow").modal('close');
        } else {            
            engageDialog({
                head: "Oops!",
                body: "Something went wrong"
            });    
        }
    }).fail((xhr) => {
        console.log("failed: ", xhr.status);
        if (xhr.status === 403 || xhr.status === 401){
            Cookies.remove("token");
            window.location.replace("/");
        } else {
            engageDialog({
                head: "Cannot publish",
                body: "Something went wrong."
            });
        }
    });
}

