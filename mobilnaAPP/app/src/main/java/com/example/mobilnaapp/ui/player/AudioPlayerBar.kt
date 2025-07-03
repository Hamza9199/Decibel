package com.example.mobilnaapp.ui.player

import android.content.Context
import android.media.MediaPlayer
import android.util.AttributeSet
import android.view.Gravity
import android.widget.FrameLayout
import android.widget.ImageButton
import android.widget.ProgressBar
import android.widget.TextView
import androidx.core.content.ContextCompat
import com.example.mobilnaapp.R
import com.example.mobilnaapp.data.model.Pjesma

class AudioPlayerBar @JvmOverloads constructor(
    context: Context, attrs: AttributeSet? = null
) : FrameLayout(context, attrs) {

    private val title: TextView
    private val playPause: ImageButton
    private val progress: ProgressBar

    private var mediaPlayer: MediaPlayer? = null

    init {
        setBackgroundColor(ContextCompat.getColor(context, R.color.spotify_card_bg))
        elevation = 12f
        val params = LayoutParams(LayoutParams.MATCH_PARENT, 140)
        params.gravity = Gravity.BOTTOM
        layoutParams = params

        title = TextView(context).apply {
            setTextColor(ContextCompat.getColor(context, R.color.white))
            textSize = 18f
            setPadding(32, 0, 0, 0)
        }
        playPause = ImageButton(context).apply {
            setImageResource(android.R.drawable.ic_media_pause)
            setBackgroundColor(ContextCompat.getColor(context, android.R.color.transparent))
        }
        progress = ProgressBar(context, null, android.R.attr.progressBarStyleHorizontal).apply {
            max = 1000
            progress = 0
        }

        val inner = FrameLayout(context)
        inner.addView(title)
        inner.addView(playPause)
        inner.addView(progress)
        addView(inner)

        playPause.setOnClickListener {
            mediaPlayer?.let {
                if (it.isPlaying) {
                    it.pause()
                    playPause.setImageResource(android.R.drawable.ic_media_play)
                } else {
                    it.start()
                    playPause.setImageResource(android.R.drawable.ic_media_pause)
                }
            }
        }
    }

    fun setSong(pjesma: Pjesma, player: MediaPlayer?) {
        title.text = pjesma.naziv
        mediaPlayer = player
        playPause.setImageResource(android.R.drawable.ic_media_pause)
        // Možeš dodati update progress bar logiku ovde
    }
}
