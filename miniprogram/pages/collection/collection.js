import Toast from "../../miniprogram_npm/@vant/weapp/toast/toast";

Page({
  data: {
    loadFinish: false,

    total: 0,
    currentIndex: 0,

    question: null,
    questionList: [],
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    this._getList();
  },

  _getList() {
    const that = this;
    wx.cloud
      .callFunction({
        name: "questionPool",
        data: {
          type: "getCollection",
        },
      })
      .then((res) => {
        // console.log(res.result)
        const {
          questionList,
          errMsg,
          errCode
        } = res.result;

        if (errCode == 0) {
          const total = questionList.length;
          const question = questionList[that.data.currentIndex];

          that.setData({
            questionList,
            total,
            question,
          });
          that.checkStar(question._id);
        } else {
          console.error(errMsg);
          wx.showToast({
            title: errMsg || "查询题目失败，请稍候重试",
            icon: "error",
          });
        }
      })
      .catch(console.error)
      .finally(() => {
        console.log("加载结束，不管成功或者失败都会调用");
        that.setData({
          loadFinish: true,
        });
      });
  },

  onDelete() {
    const that = this;
    wx.cloud
      .callFunction({
        name: "questionPool",
        data: {
          type: "removeCollection",
          questionId: that.data.question._id,
        },
      })
      .then((res) => {
        // console.log(res.result);
        const {
          errCode,
          errMsg
        } = res.result;
        if (errCode === 0) {
          Toast("删除成功");

          const tmpQuestionList = that.data.questionList.filter(
            (item) => item._id !== that.data.question._id
          );

          const total = tmpQuestionList.length;

          let newIndex, tempQuestion;

          if (total > 0) {
            newIndex = that.data.currentIndex;
            if (newIndex > tmpQuestionList.length - 1) {
              // console.log("删掉了最后一题，展示前一题")
              newIndex = newIndex - 1;
            }

            tempQuestion = tmpQuestionList[newIndex];

            that.checkStar(tempQuestion._id);
          } else {
            newIndex = 0;
            tempQuestion = null;
          }

          that.setData({
            currentIndex: newIndex,
            questionList: tmpQuestionList,
            total: total,
            question: tempQuestion,
          });
        } else {
          Toast.error("删除失败");
        }
      })
      .catch(console.error);
  },

  goPrev() {
    const that = this;
    const newIndex = that.data.currentIndex - 1;
    if (newIndex < 0) {
      // console.log("已经是第一题")
      Toast.fail("已经是第一题");
      return;
    }

    const tempQuestion = that.data.questionList[newIndex];
    that.checkStar(tempQuestion._id);

    that.setData({
      currentIndex: newIndex,
      question: tempQuestion,
    });
  },
  goNext() {
    const that = this;

    const newIndex = that.data.currentIndex + 1;
    if (newIndex > that.data.questionList.length - 1) {
      // console.log("已经是最后一题")
      Toast.success("恭喜，完成了");
      return;
    }

    const tempQuestion = that.data.questionList[newIndex];
    that.checkStar(tempQuestion._id);

    that.setData({
      currentIndex: newIndex,
      question: tempQuestion,
    });
  },

  addStar() {
    const that = this;
    wx.cloud
      .callFunction({
        name: "questionPool",
        data: {
          type: "addStar",
          question: that.data.question,
        },
      })
      .then((res) => {
        console.log(res);
        const {
          errMsg
        } = res.result;
        if (errMsg == "document.set:ok") {
          let tempQustion = that.data.question;
          tempQustion.starred = true;
          // const updateKey = `questionList[${that.data.currentIndex}]`;

          that.setData({
            question: tempQustion,
            // [updateKey]:tempQustion,
          });
          wx.showToast({
            title: "收藏成功",
            icon: "success",
            duration: 2000,
          });
        } else {
          wx.showModal({
            title: "收藏失败",
            content: errMsg,
            showCancel: false,
          });
        }
      });
  },

  checkStar(questionId) {
    const that = this;
    wx.cloud
      .callFunction({
        name: "questionPool",
        data: {
          type: "checkStar",
          questionId: questionId,
        },
      })
      .then((res) => {
        // console.log(res.result)
        const {
          errMsg,
          total
        } = res.result;

        if (errMsg == "collection.count:ok") {
          let tempQuestion = that.data.question;
          tempQuestion.starred = total > 0;

          that.setData({
            question: tempQuestion,
          });
        } else {
          console.warn("查询收藏失败");
        }
      })
      .catch(console.error);
  },

  removeStar() {
    const that = this;
    wx.cloud
      .callFunction({
        name: "questionPool",
        data: {
          type: "removeStar",
          questionId: that.data.question._id,
        },
      })
      .then((res) => {
        // console.log(res.result);
        const {
          errMsg
        } = res.result;
        if (errMsg == "collection.remove:ok") {
          let tempQustion = that.data.question;
          tempQustion.starred = false;
          // const updateKey = `questionList[${that.data.currentIndex}]`;

          that.setData({
            question: tempQustion,
            // [updateKey]:tempQustion,
          });

          wx.showToast({
            title: "取消收藏成功",
            icon: "success",
            duration: 2000,
          });
        } else {
          wx.showModal({
            title: "取消收藏失败",
            content: errMsg,
            showCancel: false,
          });
        }
      })
      .catch(console.error);
  },
  _collectAnswer(selectedValue, tempQuestion) {
    if (tempQuestion.type == "radio") {
      return [selectedValue];
    } else if (tempQuestion.type == "checkbox") {
      let currentAnswer = tempQuestion.userAnswer || [];

      if (currentAnswer.includes(selectedValue)) {
        currentAnswer.splice(currentAnswer.indexOf(selectedValue), 1);
      } else {
        currentAnswer.push(selectedValue);
      }

      return currentAnswer.sort();
    }
  },
  onItemClick(event) {
    // console.log(event);
    const selectedValue = event.target.dataset.value;

    let tempQuestion = this.data.question;
    if (tempQuestion.showAnswer) {
      console.log("已经看过答案，不能修改选项");
      return;
    }

    tempQuestion.userAnswer = this._collectAnswer(selectedValue, tempQuestion);

    this.setData({
      question: tempQuestion,
    });
  },

  onShowAnswer() {
    let tempQuestion = this.data.question;
    tempQuestion.showAnswer = true;
    this.setData({
      question: tempQuestion,
    });
  },

  goHome() {
    wx.redirectTo({
      url: "/pages/index/index",
    });
  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage: function () {},
});