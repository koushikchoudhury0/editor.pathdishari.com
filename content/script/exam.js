var selectedPackageId, selectedPackageName;

const defaultSrc = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

class ValidationError extends Error {
    constructor(message) {
        super(message);
        this.name = "ValidationError";
    }
}

$(document).ready(() => {
    $("header").load("/content/layout/navbar.html", () => {        
        $("ul.tabs li:eq(0) a").addClass("active");
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
            fetchAllExams($("#sectorList").formSelect('getSelectedValues')[0]);
            console.log($("#sectorList").formSelect('getSelectedValues')[0]);
            $("#sectorPreview").text($("#sectorList").formSelect('getSelectedValues')[0]);
            $("#fab").css({"visibility": "visible"});
        });        
        loadMaterialModalPromise(".modalContainer").then(()=>{    
            M.AutoInit();
            $("#fab").floatingActionButton({
                hoverEnabled: false,
                direction: "left"
            });
            $('.characterCountable').characterCounter();
            $(".sidenavHeader").html(`Existing Exams<i style="margin-right: 10px" class="material-icons">format_shapes</i>`); 
            $(`<x onclick="$('#upcomingWindow').modal('open')" class="appendedLink" style=" cursor: pointer; padding-left: 25px; line-height: 16px; color: #039be5;"><span class="material-icons" style="font-size: 16px; margin-right: 10px; color: orangered; transform: translateY(2px);">cloud_upload</span>Upload Upcoming Exams</x>`).insertAfter(".slide-out-top .row");
            //enlistPackages();   
            //fetchAllExams();  
            fetchSectors();     
            //$("#dataWindow").modal('open');
        }); 
        //$('.sidenav').sidenav(); 
        var clipboard = new ClipboardJS('#copier');      
        clipboard.on('success', function(e) {
            M.toast({html: "Exam ID Copied"});
            e.clearSelection();
        });
        $("#dataWindow #uploadInput").on('change', ()=>{
            console.log("Handling data Import");
            handleDataImport();
        });
        $("#upcomingInput").on('change', ()=>{
            console.log("Handling data Import");
            handleUpcomingImport();
        });
    });
    
});

var fetchAllExams = (sectorName) => {
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
        dismissDialog();
        if (responseBody.statusCode==1){                        
            $(".sidenavElement").remove();
            $(".divider").remove();
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

var fetchExam = (element) => {
    examId = $(element).attr("data");
    engageProgress({
        msg: "Fetching exam..."
    });
    $.ajax({
        type: "POST",
        url: "https://33qo10kq34.execute-api.ap-south-1.amazonaws.com/prod/read-exam",
        headers: {
            "Authorization": Cookies.get("token")
        },
        data: JSON.stringify({
            examId: examId
        })
    }).done((responseBody) => {        
        console.log(responseBody);
        dismissDialog();
        if (responseBody.statusCode==1){
            console.log(responseBody.exam.abbreviation);    
            $("#examDataAbbvText").html(`${responseBody.exam.abbreviation}<span onclick="$('#dataWindow').modal('open')" class="waves waves-effect material-icons">update</span>`);                                            
            $("#examIdText").text(responseBody.exam.examId);
            $("#examIcon").attr('src', `https://s3.ap-south-1.amazonaws.com/data.pathdishari.com/exam/${responseBody.exam.examId}/icon.picture`);
            $("#examDataNameText").val(responseBody.exam.name);
            $("#examDataTargetText").val(responseBody.exam.targetYear);
            $("#examDataThresholdText").val(responseBody.exam.thresholdMarks);
            $("#examDataMarksText").val(responseBody.exam.totalMarks);
            $("#examDataPatternText").val(responseBody.exam.patternYear);
            $("#examDataTimeoutText").val(responseBody.exam.timeout);
            M.updateTextFields();
            $("#chipContainer").empty();
            if (responseBody.exam.sections && responseBody.exam.sections.length>0){
                responseBody.exam.sections.forEach((v, i) => {
                    $("#chipContainer").append('<div class="chip waves-effect" data=\''+JSON.stringify(v)+'\' onclick="editSection(this)">'+v.name+'<i onclick="event.stopPropagation(); $(this).parent().remove();" class="close material-icons">close</i></div>');
                });
            }
            $(".sidenavElement").removeClass("active");
            $(element).addClass("active");
            $(".container.placeholder").fadeOut("fast", () => {
                $(".container.primary").fadeIn("fast");
            });
        } else {//https://33qo10kq34.execute-api.ap-southttps://33qo10kq34.execute-api.ap-south-1.amazonaws.com/prod/update-exam-sectionh-1.amazonaws.com/prod/update-exam-section
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
                head: "Cannot fetch exam",
                body: "Something went wrong."
            });
        }
    });
}

var editSection = (element) => {
    sectionData = $(element).attr("data");
    if (!sectionData){
        M.toast({html: "Something went wrong"});
        return;
    }    
    sectionData = JSON.parse(sectionData);
    $("#sectorEditExam").text($(".sidenavElement.active .examAbbreviation").text());
    $("#sectionNameText").val(sectionData.name);
    $("#sectionQsnText").val(sectionData.questionCount);
    $("#sectionMarksText").val(sectionData.marks);
    $("#sectionTimeText").val(sectionData.timeout);
    $("#sectionThresholdMarksText").val(sectionData.threshold);    
    M.updateTextFields();
    $("#sectionContainer").modal("open");
    $("#sectionApplyButton").off("click");
    $("#sectionApplyButton").click(() => {
        data = {
            questionCount: $("#sectionQsnText").val(),
            name: $("#sectionNameText").val(),
            marks: $("#sectionMarksText").val(),
            timeout: $("#sectionTimeText").val(),
            threshold: parseInt($("#sectionThresholdMarksText").val())
        }
        console.log("Updating with: "+JSON.stringify(data));
        $(element).attr("data", JSON.stringify(data));
        $(element).html(data.name+'<i class="close material-icons" onclick="event.stopPropagation(); $(this).parent().remove();">close</i></div>');       
        $("#sectionContainer").modal("close"); 
    });
}

var createNewSection = () => {
    $("#sectionNameText").val("");
    $("#sectionQsnText").val("");    
    M.updateTextFields();
    $("#sectorEditExam").text($(".sidenavElement.active .examAbbreviation").text());
    if (!$("#sectorEditExam").text()){
        M.toast({html: "Select an exam first"});
        return;
    }
    $("#sectionContainer").modal("open");
    $("#sectionNameText").focus(); 
    $("#sectionApplyButton").off("click");
    $("#sectionApplyButton").click(() => {
        data = {
            questionCount: $("#sectionQsnText").val(),
            name: $("#sectionNameText").val(),
            marks: $("#sectionMarksText").val(),
            timeout: $("#sectionTimeText").val(),
            threshold: parseInt($("#sectionThresholdMarksText").val())
        }
        if (!data.questionCount || !data.name){
            M.toast({html: "All fields are required"});            
        } else {
            $("#chipContainer").append('<div class="chip waves-effect" onclick="editSection(this)" data=\''+JSON.stringify(data)+'\'>'+data.name+'<i class="close material-icons" onclick="event.stopPropagation(); $(this).parent().remove();">close</i></div>');
            $("#sectionNameText").val("");
            $("#sectionQsnText").val("");       
            $("#sectionContainer").modal("close");
        }
         
    });
}

var copyExamId = () => {
    var src = $("#examIdText");
    src.select();
    //src.text().setSelectionRange(0, 99999);
    console.log(document.execCommand("copy"));
}

var fetchSectors = () => {
    console.log("fetching sectors");
    engageProgress({
        msg: "Fetching sectors ..."
    });
    $.ajax({
        type: "POST",
        url: "https://33qo10kq34.execute-api.ap-south-1.amazonaws.com/prod/read-sectors",
        headers: {
            "Authorization": Cookies.get("token")
        }
    }).done((responseBody) => {        
        console.log(responseBody);
        dismissDialog();
        if (responseBody.statusCode==1){                        
            $("#sectorList").empty().append('<option disabled selected>Choose Sector</option>');
            $("#creationSectorList").empty().append('<option disabled selected>Choose Sector</option>');                        
            if (responseBody.sectors.length==0){                
                M.toast({html: "No sectors to fetch"});                
            } else {                
                responseBody.sectors.forEach((v, i) => {                                    
                    $("#sectorList").append("<option data='"+v.sectorName+"'>"+v.sectorName+"</option>");
                    $("#creationSectorList").append("<option data='"+v.sectorName+"'>"+v.sectorName+"</option>");
                });    
                $("#sectorList").formSelect();
                //$("#creationSectorList").formSelect();                                
            }            
        } else {
            console.log(JSON.stringify(responseBody));
            engageDialog({
                head: "Cannot fetch any more!",
                body: "Something went wrong"
            });    
        }
    }).fail((xhr) => {
        dismissDialog();
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

var createExam = () => {    
    examData = {
        "abbreviation": $("#examAbbvText").val(),
        "fullName": $("#examNameText").val(),
        "sector": $("#sectorPreview").text(),
        "targetYear": $("#examTargetText").val(),
        "patternYear": $("#examPatternText").val(),
        "thresholdMarks": $("#examThresholdText").val(),
        "totalMarks": $("#examMarksText").val(),
        "timeout": $("#examTimeoutText").val(),
    }
    var allowed = true;
    Object.entries(examData).forEach(([key, value]) => {
        if (value.trim().length==0) allowed = false;
    });
    if (!allowed){
        engageDialog({
            head: "Invalid Exam Configured",
            body: "All fields must be filled"
        })
        return;
    }
    engageProgress({
        msg: "Creating exam..."
    });    
    $.ajax({
        type: "POST",
        url: "https://33qo10kq34.execute-api.ap-south-1.amazonaws.com/prod/create-exam",
        headers: {
            "Authorization": Cookies.get("token")
        },
        data: JSON.stringify(examData)
    }).done((responseBody) => {        
        console.log(responseBody);
        dismissDialog();
        if (responseBody.statusCode==1){
            $("#inputContainer").modal('close');
            $(".clear").val("");
            M.AutoInit();       
            M.updateTextFields();                 
            M.toast({html: "Exam Created"});
            $("ul.sidenav").append(getSidenavElementBody(responseBody.createdExam.examId, responseBody.createdExam.abbreviation));
        } else {
            console.log(JSON.stringify(responseBody));
            engageDialog({
                head: "Coudn't create exam",
                body: "Something went wrong"
            });    
        }
    }).fail((xhr) => {
        dismissDialog();
        console.log("failed: ", xhr.status);
        if (xhr.status === 403 || xhr.status === 401){
            Cookies.remove("token");
            window.location.replace("/");
        } else {
            engageDialog({
                head: "Couldn't create exam",
                body: "Something went wrong"
            });
        }
    });
}

var updateExamSections = () => {
    sectionData = {
        examId: $(".sidenavElement.active").attr("data"),
        sections: []
    };    
    $("#chipContainer").children(".chip").each((i, v) => {
        ob = JSON.parse($(v).attr("data"));
        sectionData.sections.push({
            name: ob.name.trim(),
            questionCount: parseInt(ob.questionCount),
            marks: parseInt(ob.marks),
            timeout: parseInt(ob.timeout),
            threshold: parseInt(ob.threshold)            
        });
    });
    console.log(JSON.stringify(sectionData));    
    engageProgress({
        msg: "Updating Sections..."
    });       
    $.ajax({
        type: "POST",
        url: "https://33qo10kq34.execute-api.ap-south-1.amazonaws.com/prod/update-exam-section",
        headers: {
            "Authorization": Cookies.get("token")
        },
        data: JSON.stringify(sectionData)
    }).done((responseBody) => {        
        console.log(responseBody);
        dismissDialog();
        if (responseBody.statusCode==1){                             
            M.toast({html: "Sections Updated"});            
        } else {
            console.log(JSON.stringify(responseBody));
            engageDialog({
                head: "Coudn't update exam",
                body: "Something went wrong"
            });    
        }
    }).fail((xhr) => {
        dismissDialog();
        console.log("failed: ", xhr.status);
        if (xhr.status === 403 || xhr.status === 401){
            Cookies.remove("token");
            window.location.replace("/");
        } else {
            engageDialog({
                head: "Couldn't update exam",
                body: "Something went wrong"
            });
        }
    });
}

var updateExamData = () => {
    examData = {
        examId: $(".sidenavElement.active").attr("data"),
        name: $("#examDataNameText").val(),
        targetYear: $("#examDataTargetText").val(),
        thresholdMarks: $("#examDataThresholdText").val(),
        totalMarks: $("#examDataMarksText").val(),
        patternYear: $("#examDataPatternText").val(),
        timeout: $("#examDataTimeoutText").val()
    }  
    var allowed = true;
    Object.entries(examData).forEach(([key, value]) => {
        if (value.trim().length==0) allowed = false;
    });
    if (!allowed){
        M.toast({html: "All fields must be filled and an exam must be selected"});
        return;
    }
    engageProgress({
        msg: "Updating Exam..."
    });   
    console.log(examData);
    $.ajax({
        type: "POST",
        url: "https://33qo10kq34.execute-api.ap-south-1.amazonaws.com/prod/update-exam-data",
        headers: {
            "Authorization": Cookies.get("token")
        },
        data: JSON.stringify(examData)
    }).done((responseBody) => {        
        console.log(responseBody);
        dismissDialog();
        if (responseBody.statusCode==1){                             
            M.toast({html: "Exam Updated"});            
        } else {
            console.log(JSON.stringify(responseBody));
            engageDialog({
                head: "Coudn't update exam",
                body: "Something went wrong"
            });    
        }
    }).fail((xhr) => {
        dismissDialog();
        console.log("failed: ", xhr.status);
        if (xhr.status === 403 || xhr.status === 401){
            Cookies.remove("token");
            window.location.replace("/");
        } else {
            engageDialog({
                head: "Couldn't update exam",
                body: "Something went wrong"
            });
        }
    });
}

var getSidenavElementBody = (examId, examAbbreviation) => {
    return '\
    <li>\
        <div onclick="fetchExam(this)" data="'+examId+'" class="waves-effect sidenavElement">\
            <a class="examAbbreviation">'+examAbbreviation+'</a>\
        </div>\
        <li><div style="margin-top: 0" class="divider"></div></li>\
    </li>\
    ';
}

var readImageFromDisk = (input, target = $(input).parent().children("img")) => {
    console.log("reading from disk");
    if (input.files && input.files[0]) {
        var reader = new FileReader();        
        reader.onload = function(e) {
            if (e.target.result.length/1024 > 100){
                engageDialog({
                    head: "Oops!",
                    body: `Icon Image size cannot exceed <b>100 KB</b>. Currently it is <b>${parseInt(e.target.result.length/1024)} KB</b>.`
                })
            } else {
                $(target).attr('src', e.target.result);
            }
        }        
        reader.readAsDataURL(input.files[0]);
    }
}

var removeImage = (elem) => {        
    $(elem).parent().parent().children("input").val('');
    $(elem).parent().parent().children("img").attr("src", defaultSrc);    
}

var chooseImage = (elem) => {
    $(elem).parent().children("input").trigger("click");
}

var getPresignedIconURL = () => {               
    if ($("#iconInput")[0].files.length != 1){
        engageDialog({
            head: "Oops!",
            body: "There aren't any new icon chosen"
        })
        return;
    }
    engageProgress({
        msg: "Requesting update..."
    });       
    $.ajax({
        type: "POST",
        url: "https://5220vu1fsl.execute-api.ap-south-1.amazonaws.com/production/url/sign",
        headers: {
            "Authorization": Cookies.get("token")
        },
        data: JSON.stringify({
            type: 687,
            path: 7,
            examId: $(".sidenavElement.active").attr("data")
        })
    }).done((responseBody) => {        
        console.log(responseBody);
        dismissDialog();
        if (responseBody.statusCode==1){                             
            uploadIcon(responseBody.url);            
        } else {
            console.log(JSON.stringify(responseBody));
            engageDialog({
                head: "Coudn't update exam",
                body: "Something went wrong"
            });    
        }
    }).fail((xhr) => {
        dismissDialog();
        console.log("failed: ", xhr.status);
        if (xhr.status === 403 || xhr.status === 401){
            Cookies.remove("token");
            window.location.replace("/");
        } else {
            engageDialog({
                head: "Couldn't update exam",
                body: "Something went wrong"
            });
        }
    });
}

var uploadIcon = (signedURL) => {
    engageProgress({
        msg: "Updating exam icon.."
    });
    $.ajax({
        url: signedURL,
        type: 'PUT',
        data: $('#iconInput')[0].files[0],
        contentType: $('#iconInput')[0].files[0].type,
        processData: false,
        cache: false,
        error: function (data) {      
            dismissDialog();
            engageDialog({
                head: "Oops!",
                body: "Something went wrong. Try reloading this page."
            })
        },
        success: function (response) {            
            dismissDialog();
            M.toast({html: "Exam Icon Updated!"});
        }
    });
}

//https://5220vu1fsl.execute-api.ap-south-1.amazonaws.com/production/exam/update-icon
var handleDataImport = () => {
    //Reference the FileUpload element.
    var fileUpload = $("#dataWindow #uploadInput")[0];
 
    if (typeof (FileReader) != "undefined") {
        var reader = new FileReader();

        //For Browsers other than IE.
        if (reader.readAsBinaryString) {
            reader.onload = function (e) {
                processExamData(e.target.result);
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
                processExamData(data);
            };
            reader.readAsArrayBuffer(fileUpload.files[0]);
        }
    } else {
        alert("This browser does not support HTML5.");
    }
}

var processExamData = (data) => {
    console.log(data);
    var pieces = data.split("\n");
    $("#dataWindow #dataDump").empty();
    for (var i=0; i<pieces.length; i++){
        var data = pieces[i].split("::");
        console.log(data[1]);
        $("#dataWindow #dataDump").append(`
            <p><a class="subheading">${data[0]}: </a><a ${isValidURL(data[1])?`href="${data[1]}" target="_blank"`:`class="notURL"`}">${data[1]}</a></p>
        `);
    }
}

function isValidURL(str) {
    var pattern = new RegExp('^(https?:\\/\\/)?'+ // protocol
      '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|'+ // domain name
      '((\\d{1,3}\\.){3}\\d{1,3}))'+ // OR ip (v4) address
      '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*'+ // port and path
      '(\\?[;&a-z\\d%_.~+=-]*)?'+ // query string
      '(\\#[-a-z\\d_]*)?$','i'); // fragment locator
    return !!pattern.test(str);
}

//https://5220vu1fsl.execute-api.ap-south-1.amazonaws.com/production/exam/data/update
var getDataSignedURL = () => {
    if (!$("#dataWindow #uploadInput")[0].files[0]){
        M.toast({html: "No data imported"});
        return;
    }
    engageProgress({
        msg: "Requesting access to data..."
    });
    $.ajax({
        url: "https://5220vu1fsl.execute-api.ap-south-1.amazonaws.com/production/exam/data/update",
        type: "POST",
        headers: {
            "Authorization": Cookies.get("token")
        },
        data: JSON.stringify({
            type: 687,
            path: 1,
            examId: $("#examIdText").text()
        }),
        contentType: "application/json"        
    }).done((responseBody => {
        dismissDialog();
        if (responseBody.statusCode == 1){    
            console.log("Upload URL retrieved: ", responseBody.url);        
            engageProgress({
                msg: "Uploading data..."
            });
            uploadDataFile(responseBody.url);
        } else {
            engageDialog({
                head: "Cannot update data",
                body: "Something went wrong."
            });
        }
    })).fail((xhr) => {
        console.log("failed: ", xhr.status);
        dismissDialog();
        if (xhr.status === 403 || xhr.status === 401){
            Cookies.remove("token");
            window.location.replace("/");
        } else {
            engageDialog({
                head: "Cannot update data",
                body: "Something went wrong."
            });
        }
    })    
}

var uploadDataFile = (signedURL) => {
    $.ajax({
        url: signedURL,
        type: 'PUT',
        data: $("#dataWindow #uploadInput")[0].files[0],
        contentType: $("#dataWindow #uploadInput")[0].files[0].type,
        processData: false,
        cache: false,
        error: function (data) {      
            M.toast({html: "Update Failed"});    
            dismissDialog();  
            console.log(data);             
        },
        success: function (response) {            
            M.toast({html: "Data Updated"});
            $("#dataWindow #uploadInput").val(null);
            $("#dataWindow #dataDump").empty();            
            $("#dataWindow").modal('close');    
            dismissDialog();        
        }
    });
}

var handleUpcomingImport = () => {    
    var fileUpload = $("#upcomingInput")[0];
    if (typeof (FileReader) != "undefined") {
        var reader = new FileReader();
        //For Browsers other than IE.
        if (reader.readAsBinaryString) {
            reader.onload = function (e) {
                processUpcoming(e.target.result);
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
                processUpcoming(data);
            };
            reader.readAsArrayBuffer(fileUpload.files[0]);
        }
    } else {
        alert("This browser does not support HTML5.");
    }
}

var processUpcoming = (data) => {
    console.log(data);
    var pieces = data.split("\n");
    $("#upcomingDump").empty();
    $("#upcomingDump").append(`
        <thead>
            <tr>
                <th>Exam</th>
                <th>Expected Date</th>
                <th>Link</th>
            </tr>
        </thead>
        <tbody>
    `);
    for (var i=0; i<pieces.length; i++){
        var data = pieces[i].split("::");
        console.log(data[1]);
        $("#upcomingDump").append(`
            <tr>
                <td>${data[0]}</td>
                <td>${data[1]}</td>
                <td>${data[2]}</td>
            </tr>
        `);
    }
    $("#upcomingDump").append(`</tbody>`)
}

var getUpcomingSignedURL = () => {
    if (!$("#upcomingInput")[0].files[0]){
        M.toast({html: "No data imported"});
        return;
    }
    engageProgress({
        msg: "Requesting access to repository..."
    });
    $.ajax({
        url: "https://5220vu1fsl.execute-api.ap-south-1.amazonaws.com/production/exam/data/update",
        type: "POST",
        headers: {
            "Authorization": Cookies.get("token")
        },
        data: JSON.stringify({
            type: 687,
            path: 2
        }),
        contentType: "application/json"        
    }).done((responseBody => {
        dismissDialog();
        if (responseBody.statusCode == 1){    
            console.log("Upload URL retrieved: ", responseBody.url);                    
            uploadUpcomingFile(responseBody.url);
        } else {
            engageDialog({
                head: "Cannot update upcoming exams",
                body: "Something went wrong."
            });
        }
    })).fail((xhr) => {
        console.log("failed: ", xhr.status);
        dismissDialog();
        if (xhr.status === 403 || xhr.status === 401){
            Cookies.remove("token");
            window.location.replace("/");
        } else {
            engageDialog({
                head: "Cannot update upcoming exams",
                body: "Something went wrong."
            });
        }
    })    
}

var uploadUpcomingFile = (signedURL) => {
    engageProgress({
        msg: "Uploading list..."
    });
    $.ajax({
        url: signedURL,
        type: 'PUT',
        data: $("#upcomingInput")[0].files[0],
        contentType: $("#upcomingInput")[0].files[0].type,
        processData: false,
        cache: false,
        error: function (data) {      
            M.toast({html: "Update Failed"});    
            dismissDialog();  
            console.log(data);             
        },
        success: function (response) {            
            M.toast({html: "Data Updated"});
            $("#upcomingInput").val(null);
            $("#upcomingDump").empty();            
            $("#upcomingWindow").modal('close');    
            dismissDialog();        
        }
    });
}
