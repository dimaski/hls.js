/**
 * Buffer Helper utils, providing methods dealing buffer length retrieval
*/

const BufferHelper = {
  /**
   * filter fragments potentially evicted from buffer.
   */
  filterEvictedFragments: function(bufferedFrags, media) {
    try {
      if (media) {
        // Cache `media.buffered` at first for performance
        // accessing `media.buffered` have a cost
        const mediaBuffered = media.buffered;
        // accessing MediaElement property through a function call should be quite expensive
        const bufferedPositions = [];
        for (let i = 0; i < mediaBuffered.length; i++) {
          bufferedPositions.push({ start: mediaBuffered.start(i), end: mediaBuffered.end(i) });
        }
        return bufferedFrags.filter(frag => {
          const position = (frag.startPTS + frag.endPTS) / 2;
          for (let i = 0; i < bufferedPositions.length; i++) {
            if (position >= bufferedPositions[i].start && position <= bufferedPositions[i].end) {
              return true;
            }
          }
          return false;
        });
      }
    } catch (error) {
      // InvalidStateError: Failed to read the 'buffered' property from 'SourceBuffer':
      // This SourceBuffer has been removed from the parent media source
    }
    return [];
  },
  /**
   * Return true if `media`'s buffered include `position`
   * @param {HTMLMediaElement|SourceBuffer} media
   * @param {number} position
   * @returns {boolean}
   */
  isBuffered : function(media,position) {
    try {
      if (media) {
        let buffered = media.buffered;
        for (let i = 0; i < buffered.length; i++) {
          if (position >= buffered.start(i) && position <= buffered.end(i)) {
            return true;
          }
        }
      }
    } catch(error) {
      // this is to catch
      // InvalidStateError: Failed to read the 'buffered' property from 'SourceBuffer':
      // This SourceBuffer has been removed from the parent media source
    }
    return false;
  },

  bufferInfo : function(media, pos,maxHoleDuration) {
    try {
      if (media) {
        var vbuffered = media.buffered, buffered = [],i;
        for (i = 0; i < vbuffered.length; i++) {
          buffered.push({start: vbuffered.start(i), end: vbuffered.end(i)});
        }
        return this.bufferedInfo(buffered,pos,maxHoleDuration);
      }
    } catch(error) {
        // this is to catch
        // InvalidStateError: Failed to read the 'buffered' property from 'SourceBuffer':
        // This SourceBuffer has been removed from the parent media source
    }
    return {len: 0, start: pos, end: pos, nextStart : undefined} ;
  },

  bufferedInfo : function(buffered,pos,maxHoleDuration) {
    var buffered2 = [],
        // bufferStart and bufferEnd are buffer boundaries around current video position
        bufferLen,bufferStart, bufferEnd,bufferStartNext,i;
    // sort on buffer.start/smaller end (IE does not always return sorted buffered range)
    buffered.sort(function (a, b) {
      var diff = a.start - b.start;
      if (diff) {
        return diff;
      } else {
        return b.end - a.end;
      }
    });
    // there might be some small holes between buffer time range
    // consider that holes smaller than maxHoleDuration are irrelevant and build another
    // buffer time range representations that discards those holes
    for (i = 0; i < buffered.length; i++) {
      var buf2len = buffered2.length;
      if(buf2len) {
        var buf2end = buffered2[buf2len - 1].end;
        // if small hole (value between 0 or maxHoleDuration ) or overlapping (negative)
        if((buffered[i].start - buf2end) < maxHoleDuration) {
          // merge overlapping time ranges
          // update lastRange.end only if smaller than item.end
          // e.g.  [ 1, 15] with  [ 2,8] => [ 1,15] (no need to modify lastRange.end)
          // whereas [ 1, 8] with  [ 2,15] => [ 1,15] ( lastRange should switch from [1,8] to [1,15])
          if(buffered[i].end > buf2end) {
            buffered2[buf2len - 1].end = buffered[i].end;
          }
        } else {
          // big hole
          buffered2.push(buffered[i]);
        }
      } else {
        // first value
        buffered2.push(buffered[i]);
      }
    }
    for (i = 0, bufferLen = 0, bufferStart = bufferEnd = pos; i < buffered2.length; i++) {
      var start =  buffered2[i].start,
          end = buffered2[i].end;
      //logger.log('buf start/end:' + buffered.start(i) + '/' + buffered.end(i));
      if ((pos + maxHoleDuration) >= start && pos < end) {
        // play position is inside this buffer TimeRange, retrieve end of buffer position and buffer length
        bufferStart = start;
        bufferEnd = end;
        bufferLen = bufferEnd - pos;
      } else if ((pos + maxHoleDuration) < start) {
        bufferStartNext = start;
        break;
      }
    }
    return {len: bufferLen, start: bufferStart, end: bufferEnd, nextStart : bufferStartNext};
  }
};

export default BufferHelper;
